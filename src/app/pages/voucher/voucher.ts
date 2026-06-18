import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LedgerService } from '../../services/ledger-service';
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
import { VoucherService } from '../../services/voucher-service';

@Component({
  selector: 'app-voucher',
  imports: [ReactiveFormsModule, DecimalPipe, DatePipe],
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
  private auth = inject(AuthService);
  private alert = inject(AlertService);

  protected readonly types = VOUCHER_TYPES;

  protected readonly vouchers = signal<VoucherModel[]>([]);
  protected readonly ledgers = signal<Ledger[]>([]);
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

  // ---- per-row ledger combobox ----
  protected readonly openLine = signal<number | null>(null);
  protected readonly lineSearch = signal('');

  // ---- type-driven behaviour ----
  /** Cash & bank ledgers (Contra picks from these). */
  protected readonly cashBankLedgers = signal<LedgerOption[]>([]);
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
    const map = new Map<number, string>(this.extraNames());
    for (const l of this.ledgers()) if (l.id != null) map.set(l.id, l.ledgerName);
    return map;
  });

  /** Ledger options for the line pickers, narrowed by the voucher type. */
  protected readonly ledgerOptions = computed<LedgerOption[]>(() => {
    if (this.typeBehavior().cashBankAll) return this.cashBankLedgers();
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
    // A user-driven type change rebuilds the entry grid for that type.
    this.form.controls.type.valueChanges.subscribe(type => this.applyType(type, true));
  }

  get lines() {
    return this.form.controls.details;
  }

  /** Row 1's ledger is fixed (auto-set) for cash/bank voucher types. */
  isLedgerLocked(index: number): boolean {
    return this.typeBehavior().lockFirst && index === 0;
  }

  /** A line can be removed unless it's the locked first row or the minimum two. */
  canRemoveLine(index: number): boolean {
    return !this.isLedgerLocked(index) && this.lines.length > 2;
  }

  /**
   * Configure the entry grid for the given voucher type. When `reset` is true
   * (create, or the user switching type) the lines are rebuilt and the locked
   * first ledger is auto-selected; otherwise (edit) the loaded lines are kept
   * and only the option lists / lock state are applied.
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
        },
        error: () => this.cashBankLedgers.set([]),
      });
    } else {
      this.cashBankLedgers.set([]);
    }

    const firstLedger = this.lines.at(0)?.get('ledgerId');
    if (behavior.lockFirst) {
      firstLedger?.disable({ emitEvent: false });
      if (reset && behavior.firstSection) {
        this.service.cashBankBalances(behavior.firstSection).subscribe({
          next: list => {
            this.cacheNames(list);
            const first = list[0];
            if (first) firstLedger?.setValue(first.id, { emitEvent: false });
            this.refreshLines();
          },
          error: () => {},
        });
      }
    } else {
      firstLedger?.enable({ emitEvent: false });
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
   * Enforce the debit/credit locking rules for the current voucher type:
   * - receipt (firstSide 'debit'): all debit fields locked; row 1 debit = Σ credits.
   * - payment (firstSide 'credit'): all credit fields locked; row 1 credit = Σ debits.
   * - JV / Contra: per-row one-sided lock (a value on one side locks the other).
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
        // The locked side: all of one column, plus the first row's other cell.
        const locked = receipt ? credit : debit; // the editable column control
        const fixed = receipt ? debit : credit; // the always-locked column control
        this.setDisabled(fixed, true);
        if (i === 0) {
          this.setDisabled(locked, true);
          this.setZero(locked);
        } else {
          this.setDisabled(locked, false);
          total += Number(locked.value) || 0;
        }
      }
      const firstFixed = receipt ? lines.at(0).get('debit')! : lines.at(0).get('credit')!;
      if ((Number(firstFixed.value) || 0) !== total) {
        firstFixed.setValue(total, { emitEvent: false });
      }
      return;
    }

    // JV / Contra: per-row one-sided locking based on which side has a value.
    for (let i = 0; i < count; i++) {
      const debit = lines.at(i).get('debit')!;
      const credit = lines.at(i).get('credit')!;
      const dv = Number(debit.value) || 0;
      const cv = Number(credit.value) || 0;
      if (dv > 0) {
        this.setZero(credit);
        this.setDisabled(credit, true);
        this.setDisabled(debit, false);
      } else if (cv > 0) {
        this.setZero(debit);
        this.setDisabled(debit, true);
        this.setDisabled(credit, false);
      } else {
        this.setDisabled(debit, false);
        this.setDisabled(credit, false);
      }
    }
  }

  private setDisabled(ctrl: AbstractControl, disabled: boolean) {
    if (disabled && ctrl.enabled) ctrl.disable({ emitEvent: false });
    else if (!disabled && ctrl.disabled) ctrl.enable({ emitEvent: false });
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
    if (this.isLedgerLocked(index)) return; // keep the auto-set first ledger
    this.lines.removeAt(index);
    this.refreshLines();
  }

  // ---- per-row ledger combobox ----
  toggleLineDropdown(index: number, event: Event) {
    event.stopPropagation();
    this.lineSearch.set('');
    this.openLine.update(open => (open === index ? null : index));
  }

  closeLineDropdown() {
    this.openLine.set(null);
  }

  selectLineLedger(index: number, ledger: LedgerOption) {
    const line = this.lines.at(index);
    line.get('ledgerId')?.setValue(ledger.id);
    line.get('ledgerId')?.markAsTouched();
    this.openLine.set(null);
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
    this.openLine.set(null);
    this.showForm.set(true);
    this.applyType(type, true);
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
  }

  closeForm() {
    this.showForm.set(false);
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
        remarks: (d.remarks ?? '').trim() || null,
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
      reference: raw.reference.trim() || null,
      costCenter: raw.costCenter.trim() || null,
      narration: raw.narration.trim() || null,
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
