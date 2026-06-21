import { ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, DOCUMENT } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LedgerService } from '../../services/ledger-service';
import { CostCenterService } from '../../services/cost-center-service';
import { AuthService } from '../../services/auth-service';
import { AlertService } from '../../services/alert-service';
import {
  DEFAULT_VOUCHER_BEHAVIOR,
  LedgerOption,
  Voucher as VoucherModel,
  VOUCHER_TYPE_BEHAVIOR,
  VOUCHER_TYPES,
} from '../../models/voucher.model';
import { Ledger } from '../../models/ledger.model';
import { CostCenter } from '../../models/cost-center.model';
import { VoucherService } from '../../services/voucher-service';
import { CanDirective } from '../../directives/can.directive';

@Component({
  selector: 'app-voucher',
  imports: [ReactiveFormsModule, DecimalPipe, DatePipe, CanDirective],
  templateUrl: './voucher.html',
  styleUrl: './voucher.css',
  host: {
    // Close any open ledger combobox when clicking outside of it.
    '(document:click)': 'closeLineDropdown()',
  },
})
export class Voucher {
  private fb = inject(FormBuilder);
  private service = inject(VoucherService);
  private ledgerService = inject(LedgerService);
  private costCenterService = inject(CostCenterService);
  private auth = inject(AuthService);
  private alert = inject(AlertService);
  private cdr = inject(ChangeDetectorRef);
  private document = inject(DOCUMENT);

  protected readonly types = VOUCHER_TYPES;

  protected readonly vouchers = signal<VoucherModel[]>([]);
  protected readonly ledgers = signal<Ledger[]>([]);
  protected readonly costCenters = signal<CostCenter[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  // ---- list filters ----
  protected readonly search = signal('');
  protected readonly typeFilter = signal('');
  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');

  // ---- form state ----
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly loadingDetail = signal(false);
  protected readonly formError = signal('');

  // ---- view (read-only) state ----
  protected readonly viewing = signal<VoucherModel | null>(null);
  protected readonly loadingView = signal(false);

  protected readonly viewTotalDebit = computed(() =>
    (this.viewing()?.details ?? []).reduce((sum, d) => sum + (Number(d.debit) || 0), 0),
  );
  protected readonly viewTotalCredit = computed(() =>
    (this.viewing()?.details ?? []).reduce((sum, d) => sum + (Number(d.credit) || 0), 0),
  );

  // ---- per-row ledger combobox ----
  protected readonly openLine = signal<number | null>(null);
  protected readonly lineSearch = signal('');
  /** Index of the keyboard-highlighted option within filteredLedgers(). */
  protected readonly activeLedgerIndex = signal(0);

  // ---- type-driven behaviour ----
  /** Cash & bank ledgers (Contra picks from these). */
  protected readonly cashBankLedgers = signal<LedgerOption[]>([]);
  /** Cash/bank ledgers for the locked first row (receipt/payment row 1). */
  protected readonly firstLedgerOptions = signal<LedgerOption[]>([]);
  /** Currently selected voucher type, mirrored from the form for reactivity. */
  protected readonly voucherType = signal<string>(VOUCHER_TYPES[0].code);
  /** Names for ledgers that come from CashBankBalance but not the full list. */
  private readonly extraNames = signal<Map<number, string>>(new Map());

  protected readonly typeBehavior = computed(
    () => VOUCHER_TYPE_BEHAVIOR[this.voucherType()] ?? DEFAULT_VOUCHER_BEHAVIOR,
  );

  protected readonly form = this.fb.nonNullable.group({
    type: [VOUCHER_TYPES[0].code, Validators.required],
    voucherDate: [this.today(), Validators.required],
    reference: [''],
    costCenter: [''],
    narration: [''],
    details: this.fb.array([this.newLine(), this.newLine()]),
  });

  // Bumped on every change to the detail lines (value edits, add, remove) so
  // the totals recompute. We use an explicit signal rather than
  // valueChanges → toSignal because the auto-zero/lock logic mutates controls
  // with emitEvent:false and the app runs zoneless change detection, which
  // makes array-level valueChanges propagation unreliable for this. Totals
  // read getRawValue() so locked (disabled) lines still count.
  private readonly recalc = signal(0);

  protected readonly totalDebit = computed(() => {
    this.recalc();
    return this.lines.getRawValue().reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  });
  protected readonly totalCredit = computed(() => {
    this.recalc();
    return this.lines.getRawValue().reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  });
  protected readonly difference = computed(() => this.totalDebit() - this.totalCredit());
  protected readonly isBalanced = computed(
    () => this.totalDebit() > 0 && Math.abs(this.difference()) < 0.005,
  );

  protected readonly ledgerNameById = computed(() => {
    const map = new Map<number, string>();
    for (const l of this.ledgers()) if (l.id != null) map.set(l.id, l.ledgerName);
    // CashBankBalance names (e.g. "Cash In Hand(548100.00)") win over the plain
    // ledger-list names, so the locked first ledger shows the API label.
    for (const [id, name] of this.extraNames()) map.set(id, name);
    return map;
  });

  /**
   * Ledger options for the open picker, narrowed by voucher type and row:
   * - Contra: cash & bank ledgers for every row.
   * - receipt/payment row 1: only the cash/bank ledgers of that section.
   * - everything else: the full ledger list.
   */
  protected readonly ledgerOptions = computed<LedgerOption[]>(() => {
    const behavior = this.typeBehavior();
    if (behavior.cashBankAll) return this.cashBankLedgers();
    if (behavior.lockFirst && this.openLine() === 0) return this.firstLedgerOptions();
    return this.ledgers()
      .filter(l => l.id != null)
      .map(l => ({ id: l.id as number, ledgerName: l.ledgerName }));
  });

  protected readonly filteredLedgers = computed(() => {
    const term = this.lineSearch().trim().toLowerCase();
    const list = this.ledgerOptions();
    if (!term) return list;
    return list.filter(l => l.ledgerName.toLowerCase().includes(term));
  });

  /** Client-side text filter over the server-fetched rows. */
  protected readonly filteredVouchers = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.vouchers();
    return this.vouchers().filter(v => {
      const haystack = [v.voucherNo, v.reference, v.narration, v.type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  });

  protected readonly totalAmount = computed(() =>
    this.filteredVouchers().reduce((sum, v) => sum + this.voucherAmount(v), 0),
  );

  constructor() {
    this.loadVouchers();
    this.loadLedgers();
    this.loadCostCenters();
    // A user-driven type change rebuilds the entry grid for that type.
    this.form.controls.type.valueChanges.subscribe(type => this.applyType(type, true));
  }

  get lines() {
    return this.form.controls.details;
  }

  /** Row 1 is the dedicated cash/bank line for receipt/payment vouchers. */
  isFirstCashBankRow(index: number): boolean {
    return this.typeBehavior().lockFirst && index === 0;
  }

  /** A line can be removed unless it's the cash/bank row or the minimum two. */
  canRemoveLine(index: number): boolean {
    return !this.isFirstCashBankRow(index) && this.lines.length > 2;
  }

  /**
   * Configure the entry grid for the given voucher type. When `reset` is true
   * (create, or the user switching type) the lines are rebuilt and the first
   * cash/bank ledger is auto-selected; otherwise (edit) the loaded lines are
   * kept and only the option lists are (re)loaded.
   */
  private applyType(type: string, reset: boolean) {
    this.voucherType.set(type);
    const behavior = this.typeBehavior();

    if (reset) {
      this.lines.clear();
      this.lines.push(this.newLine());
      this.lines.push(this.newLine());
      this.bump();
    }

    // Contra: every picker is limited to cash & bank ledgers.
    if (behavior.cashBankAll) {
      this.service.cashBankBalances('').subscribe({
        next: list => {
          this.cashBankLedgers.set(list);
          this.cacheNames(list);
          this.cdr.markForCheck();
        },
        error: () => this.cashBankLedgers.set([]),
      });
    } else {
      this.cashBankLedgers.set([]);
    }

    // Receipt/payment: row 1 picks from the section's cash/bank ledgers. The
    // first is selected by default but the user may choose another (e.g. a
    // different bank). The ledger control stays enabled so it's selectable.
    if (behavior.lockFirst && behavior.firstSection) {
      const firstLedger = this.lines.at(0)?.get('ledgerId');
      this.service.cashBankBalances(behavior.firstSection).subscribe({
        next: list => {
          this.firstLedgerOptions.set(list);
          this.cacheNames(list);
          if (reset && list[0]) firstLedger?.setValue(list[0].id, { emitEvent: false });
          this.refreshLines();
          this.cdr.markForCheck();
        },
        error: () => this.firstLedgerOptions.set([]),
      });
    } else {
      this.firstLedgerOptions.set([]);
    }

    // Apply the debit/credit locks (and the row-1 auto amount) for this type.
    this.refreshLines();
  }

  private cacheNames(list: LedgerOption[]) {
    this.extraNames.update(prev => {
      const map = new Map(prev);
      for (const o of list) map.set(o.id, o.ledgerName);
      return map;
    });
  }

  typeLabel(code: string): string {
    return this.types.find(t => t.code === code)?.label ?? code;
  }

  /** Best-effort total for a list row, from summary fields or its detail lines. */
  voucherAmount(v: VoucherModel): number {
    if (v.totalDebit != null) return v.totalDebit;
    if (v.amount != null) return v.amount;
    return (v.details ?? []).reduce((sum, d) => sum + (Number(d.debit) || 0), 0);
  }

  ledgerName(id: number | null | undefined): string {
    if (id == null) return '';
    return this.ledgerNameById().get(id) ?? `#${id}`;
  }

  // ---- list ----
  loadVouchers() {
    this.loading.set(true);
    this.error.set('');
    this.service
      .search({
        type: this.typeFilter() || null,
        fromDate: this.fromDate() || null,
        toDate: this.toDate() || null,
      })
      .subscribe({
        next: result => {
          this.vouchers.set(result.items);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load vouchers.');
          this.loading.set(false);
        },
      });
  }

  private loadLedgers() {
    this.ledgerService.search({}).subscribe({
      next: result => this.ledgers.set(result.items),
      error: () => {},
    });
  }

  private loadCostCenters() {
    this.costCenterService.search({ activeOnly: true }).subscribe({
      next: items => this.costCenters.set(items),
      error: () => {},
    });
  }

  /** Resolve a cost-center id to its name for read-only display. */
  costCenterName(value: string | null | undefined): string {
    if (value == null || value === '') return '';
    const match = this.costCenters().find(c => String(c.id) === String(value));
    return match?.name ?? String(value);
  }

  clearFilters() {
    this.typeFilter.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.search.set('');
    this.loadVouchers();
  }

  // ---- detail line helpers ----
  private newLine(detail?: {
    ledgerId: number | null;
    debit: number;
    credit: number;
    remarks: string;
  }) {
    const group = this.fb.nonNullable.group({
      ledgerId: [detail?.ledgerId ?? null, Validators.required],
      debit: [detail?.debit ?? 0, Validators.min(0)],
      credit: [detail?.credit ?? 0, Validators.min(0)],
      remarks: [detail?.remarks ?? ''],
    });
    // Any edit re-applies the type-driven locks and recomputes totals.
    group.controls.debit.valueChanges.subscribe(() => this.refreshLines());
    group.controls.credit.valueChanges.subscribe(() => this.refreshLines());
    return group;
  }

  /** Re-apply line locks/auto-amounts, then recompute totals. */
  private refreshLines() {
    this.syncLineLocks();
    this.bump();
  }

  /**
   * Keep line VALUES consistent with the voucher type. The read-only (locked)
   * state of each cell is decided in the template by {@link isAmountReadonly};
   * here we only zero the locked cells and auto-fill the first row's total.
   * - receipt (firstSide 'debit'): all debit cells 0; row 1 debit = Σ credits.
   * - payment (firstSide 'credit'): all credit cells 0; row 1 credit = Σ debits.
   * - JV / Contra: a value on one side zeroes the other (one-sided line).
   * All mutations use emitEvent:false to avoid feedback loops.
   */
  private syncLineLocks() {
    const behavior = this.typeBehavior();
    const lines = this.lines;
    const count = lines.length;

    if (behavior.firstSide) {
      const receipt = behavior.firstSide === 'debit';
      let total = 0;
      for (let i = 0; i < count; i++) {
        const debit = lines.at(i).get('debit')!;
        const credit = lines.at(i).get('credit')!;
        const editable = receipt ? credit : debit; // user enters here on rows 2+
        const fixed = receipt ? debit : credit; // always zero (row 1 gets the total)
        this.setZero(fixed);
        if (i === 0) this.setZero(editable);
        else total += Number(editable.value) || 0;
      }
      const firstFixed = receipt ? lines.at(0).get('debit')! : lines.at(0).get('credit')!;
      if ((Number(firstFixed.value) || 0) !== total) {
        firstFixed.setValue(total, { emitEvent: false });
      }
      return;
    }

    // JV / Contra: a value on one side clears the other.
    for (let i = 0; i < count; i++) {
      const debit = lines.at(i).get('debit')!;
      const credit = lines.at(i).get('credit')!;
      const dv = Number(debit.value) || 0;
      const cv = Number(credit.value) || 0;
      if (dv > 0 && cv) this.setZero(credit);
      else if (cv > 0 && dv) this.setZero(debit);
    }
  }

  /** Whether a debit/credit cell is locked (read-only) for the current type. */
  isAmountReadonly(index: number, side: 'debit' | 'credit'): boolean {
    const behavior = this.typeBehavior();
    if (behavior.firstSide) {
      const receipt = behavior.firstSide === 'debit';
      const lockedColumn = receipt ? 'debit' : 'credit'; // whole column is locked
      if (side === lockedColumn) return true;
      return index === 0; // the editable column is locked only on the first row
    }
    // JV / Contra: a side is locked when the other side carries a value.
    const line = this.lines.at(index);
    const other = side === 'debit' ? line.get('credit')?.value : line.get('debit')?.value;
    return (Number(other) || 0) > 0;
  }

  private setZero(ctrl: AbstractControl) {
    if ((Number(ctrl.value) || 0) !== 0) ctrl.setValue(0, { emitEvent: false });
  }

  /** Signal the totals to recompute from the current line values. */
  private bump() {
    this.recalc.update(n => n + 1);
  }

  addLine() {
    this.lines.push(this.newLine());
    this.refreshLines();
  }

  removeLine(index: number) {
    if (this.lines.length <= 2) return;
    if (this.isFirstCashBankRow(index)) return; // keep the cash/bank row
    this.lines.removeAt(index);
    this.refreshLines();
  }

  // ---- per-row ledger combobox ----
  toggleLineDropdown(index: number, event: Event) {
    event.stopPropagation();
    if (this.openLine() === index) {
      this.openLine.set(null);
      return;
    }
    this.openLineDropdown(index);
  }

  /** Open a row's picker, highlight its selection and focus the search box. */
  private openLineDropdown(index: number) {
    this.lineSearch.set('');
    this.openLine.set(index);
    const selectedId = this.lines.at(index)?.get('ledgerId')?.value;
    const idx = this.filteredLedgers().findIndex(l => l.id === selectedId);
    this.activeLedgerIndex.set(idx >= 0 ? idx : 0);
    this.focusAfterRender('v-ledger-search-' + index);
  }

  closeLineDropdown() {
    this.openLine.set(null);
  }

  /** Keyboard handling on the closed row trigger: open on Enter / Space / ArrowDown. */
  onLineTriggerKeydown(index: number, event: KeyboardEvent) {
    if (this.openLine() === index) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.openLineDropdown(index);
    }
  }

  onLineSearchInput(value: string) {
    this.lineSearch.set(value);
    this.activeLedgerIndex.set(0);
  }

  /** Keyboard handling inside the open picker (focus stays on the search box). */
  onLineSearchKeydown(index: number, event: KeyboardEvent) {
    const list = this.filteredLedgers();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeLedgerIndex.update(i => Math.min(i + 1, list.length - 1));
        this.scrollActiveLedgerIntoView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeLedgerIndex.update(i => Math.max(i - 1, 0));
        this.scrollActiveLedgerIntoView();
        break;
      case 'Enter': {
        event.preventDefault();
        const ledger = list[this.activeLedgerIndex()];
        if (ledger) this.selectLineLedger(index, ledger);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.closeLineDropdown();
        this.focusAfterRender('v-ledger-trigger-' + index);
        break;
      case 'Tab':
        this.closeLineDropdown();
        break;
    }
  }

  private scrollActiveLedgerIntoView() {
    const el = this.document.getElementById(`v-ledger-opt-${this.activeLedgerIndex()}`);
    el?.scrollIntoView({ block: 'nearest' });
  }

  selectLineLedger(index: number, ledger: LedgerOption) {
    const line = this.lines.at(index);
    line.get('ledgerId')?.setValue(ledger.id);
    line.get('ledgerId')?.markAsTouched();
    this.openLine.set(null);
    // Selecting advances to the first editable cell of the row.
    this.focusAfterRender(this.firstEditableCellId(index));
  }

  // ---- keyboard form navigation ----
  /** Enter on a field moves focus to the next field instead of submitting. */
  onFieldEnter(event: Event, nextId: string) {
    event.preventDefault();
    this.focusById(nextId);
  }

  onDebitEnter(event: Event, index: number) {
    event.preventDefault();
    this.focusById(
      this.isAmountReadonly(index, 'credit') ? 'v-remarks-' + index : 'v-credit-' + index,
    );
  }

  onCreditEnter(event: Event, index: number) {
    event.preventDefault();
    this.focusById('v-remarks-' + index);
  }

  /** Enter on remarks moves to the next row, or out to the cost-center field. */
  onRemarksEnter(event: Event, index: number) {
    event.preventDefault();
    if (index < this.lines.length - 1) {
      this.focusById('v-ledger-trigger-' + (index + 1));
    } else {
      this.focusById('form-cost');
    }
  }

  /** Enter on the last field submits the voucher and lands focus on Save. */
  submitFromKeyboard(event: Event) {
    event.preventDefault();
    this.focusById('voucher-save');
    this.save();
  }

  /** The first cell a row's keyboard flow should land on after picking a ledger. */
  private firstEditableCellId(index: number): string {
    if (!this.isAmountReadonly(index, 'debit')) return 'v-debit-' + index;
    if (!this.isAmountReadonly(index, 'credit')) return 'v-credit-' + index;
    return 'v-remarks-' + index;
  }

  private focusById(id: string) {
    (this.document.getElementById(id) as HTMLElement | null)?.focus();
  }

  /** Focus an element after the next render flush so freshly shown nodes exist. */
  private focusAfterRender(id: string) {
    requestAnimationFrame(() => this.focusById(id));
  }

  // ---- form lifecycle ----
  openCreate() {
    this.editingId.set(null);
    this.formError.set('');
    const type = VOUCHER_TYPES[0].code;
    // emitEvent:false so the type subscription doesn't double-run; applyType
    // below rebuilds the grid for the default type.
    this.form.reset(
      { type, voucherDate: this.today(), reference: '', costCenter: '', narration: '' },
      { emitEvent: false },
    );
    this.form.controls.type.enable({ emitEvent: false }); // type is editable on create
    this.openLine.set(null);
    this.showForm.set(true);
    this.applyType(type, true);
    this.focusAfterRender('form-type');
  }

  openEdit(voucher: VoucherModel) {
    if (voucher.id == null) return;
    this.editingId.set(voucher.id);
    this.formError.set('');
    this.openLine.set(null);
    this.showForm.set(true);
    this.loadingDetail.set(true);
    // The list row may not carry detail lines, so fetch the full voucher.
    this.service.getById(voucher.id).subscribe({
      next: full => {
        this.populateForm(full);
        this.loadingDetail.set(false);
      },
      error: () => {
        this.formError.set('Failed to load voucher details.');
        this.loadingDetail.set(false);
      },
    });
  }

  private populateForm(voucher: VoucherModel) {
    this.lines.clear();
    const details = voucher.details ?? [];
    for (const d of details) {
      this.lines.push(
        this.newLine({
          ledgerId: d.ledgerId,
          debit: d.debit ?? 0,
          credit: d.credit ?? 0,
          remarks: d.remarks ?? '',
        }),
      );
    }
    while (this.lines.length < 2) this.lines.push(this.newLine());
    const type = voucher.type ?? VOUCHER_TYPES[0].code;
    this.form.patchValue(
      {
        type,
        voucherDate: (voucher.voucherDate ?? '').slice(0, 10) || this.today(),
        reference: voucher.reference ?? '',
        costCenter: voucher.costCenter ?? '',
        narration: voucher.narration ?? '',
      },
      // Don't trigger the type subscription (which would wipe the loaded lines).
      { emitEvent: false },
    );
    // Apply option lists / lock state for the loaded type without resetting
    // rows (applyType calls refreshLines, which recomputes locks and totals).
    this.applyType(type, false);
    this.form.controls.type.disable({ emitEvent: false }); // type is fixed on edit
    this.focusAfterRender('form-type');
  }

  closeForm() {
    this.showForm.set(false);
  }

  // ---- view (read-only) ----
  openView(voucher: VoucherModel) {
    if (voucher.id == null) return;
    this.viewing.set(voucher);
    this.loadingView.set(true);
    // The list row may not carry detail lines, so fetch the full voucher.
    this.service.getById(voucher.id).subscribe({
      next: full => {
        this.viewing.set(full);
        this.loadingView.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.loadingView.set(false),
    });
  }

  closeView() {
    this.viewing.set(null);
  }

  /** Resolve a detail line's ledger name, preferring the API-supplied label. */
  detailLedgerName(detail: { ledgerId: number; ledgerName?: string | null }): string {
    return detail.ledgerName ?? this.ledgerName(detail.ledgerId);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Please complete the highlighted fields.');
      return;
    }

    const raw = this.form.getRawValue();
    const details = raw.details
      .filter(d => d.ledgerId != null && ((Number(d.debit) || 0) !== 0 || (Number(d.credit) || 0) !== 0))
      .map(d => ({
        ledgerId: d.ledgerId as number,
        debit: Number(d.debit) || 0,
        credit: Number(d.credit) || 0,
        remarks: (d.remarks ?? '').trim() || "",
      }));

    if (details.length < 2) {
      this.formError.set('Add at least two ledger lines.');
      return;
    }
    if (!this.isBalanced()) {
      this.formError.set('Voucher is not balanced — total debit must equal total credit.');
      return;
    }

    const actor = this.actor();
    const id = this.editingId();
    const payload: VoucherModel = {
      type: raw.type,
      voucherDate: raw.voucherDate,
      reference: raw.reference.trim() || "",
      costCenter: raw.costCenter.trim() || "",
      narration: raw.narration.trim() || "",
      details,
    };
    if (id == null) {
      payload.postBy = actor;
    } else {
      payload.postBy = actor;
      payload.updateBy = actor;
    }

    this.saving.set(true);
    this.formError.set('');
    const request = id == null ? this.service.add(payload) : this.service.update(id, payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.alert.success(`Voucher ${id == null ? 'created' : 'updated'} successfully.`);
        this.loadVouchers();
      },
      error: () => {
        this.saving.set(false);
        this.formError.set('Failed to save the voucher.');
        this.alert.error('Failed to save the voucher.');
      },
    });
  }

  async remove(voucher: VoucherModel) {
    if (voucher.id == null) return;
    const label = voucher.voucherNo ? `voucher "${voucher.voucherNo}"` : 'this voucher';
    if (!(await this.alert.confirmDelete(label))) return;
    this.service.delete(voucher.id).subscribe({
      next: () => {
        this.alert.success('Voucher deleted successfully.');
        this.loadVouchers();
      },
      error: () => {
        this.error.set('Failed to delete the voucher.');
        this.alert.error('Failed to delete the voucher.');
      },
    });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private actor(): string {
    const user = this.auth.getUser();
    return user?.userName ?? user?.username ?? 'admin';
  }
}
