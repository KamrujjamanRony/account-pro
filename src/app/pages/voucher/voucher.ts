import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LedgerService } from '../../services/ledger-service';
import { AuthService } from '../../services/auth-service';
import { AlertService } from '../../services/alert-service';
import { Voucher as VoucherModel, VOUCHER_TYPES } from '../../models/voucher.model';
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

  protected readonly form = this.fb.nonNullable.group({
    type: ['JV', Validators.required],
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
    return map;
  });

  protected readonly filteredLedgers = computed(() => {
    const term = this.lineSearch().trim().toLowerCase();
    const list = this.ledgers();
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
  }

  get lines() {
    return this.form.controls.details;
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
    // A line is one-sided: the side carrying a value locks (disables) the other.
    // Driven at the control level so it applies on create, on edit (loaded
    // values), and as the user types.
    const lock = () => {
      const debit = Number(group.controls.debit.value) || 0;
      const credit = Number(group.controls.credit.value) || 0;
      if (debit > 0) group.controls.credit.disable({ emitEvent: false });
      else group.controls.credit.enable({ emitEvent: false });
      if (credit > 0) group.controls.debit.disable({ emitEvent: false });
      else group.controls.debit.enable({ emitEvent: false });
    };
    group.controls.debit.valueChanges.subscribe(value => {
      if (value && group.controls.credit.value) {
        group.controls.credit.setValue(0, { emitEvent: false });
      }
      lock();
      this.bump();
    });
    group.controls.credit.valueChanges.subscribe(value => {
      if (value && group.controls.debit.value) {
        group.controls.debit.setValue(0, { emitEvent: false });
      }
      lock();
      this.bump();
    });
    lock(); // initial state — handles values loaded in edit mode
    return group;
  }

  /** Signal the totals to recompute from the current line values. */
  private bump() {
    this.recalc.update(n => n + 1);
  }

  addLine() {
    this.lines.push(this.newLine());
    this.bump();
  }

  removeLine(index: number) {
    if (this.lines.length <= 2) return;
    this.lines.removeAt(index);
    this.bump();
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

  selectLineLedger(index: number, ledger: Ledger) {
    const line = this.lines.at(index);
    line.get('ledgerId')?.setValue(ledger.id ?? null);
    line.get('ledgerId')?.markAsTouched();
    this.openLine.set(null);
  }

  // ---- form lifecycle ----
  openCreate() {
    this.editingId.set(null);
    this.formError.set('');
    this.lines.clear();
    this.lines.push(this.newLine());
    this.lines.push(this.newLine());
    this.form.reset({
      type: 'JV',
      voucherDate: this.today(),
      reference: '',
      costCenter: '',
      narration: '',
    });
    this.openLine.set(null);
    this.showForm.set(true);
    this.bump();
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
    this.form.patchValue({
      type: voucher.type ?? 'JV',
      voucherDate: (voucher.voucherDate ?? '').slice(0, 10) || this.today(),
      reference: voucher.reference ?? '',
      costCenter: voucher.costCenter ?? '',
      narration: voucher.narration ?? '',
    });
    this.bump();
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
