import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LedgerService } from '../../services/ledger-service';
import { ChartOfAccountService } from '../../services/chart-of-account-service';
import { AuthService } from '../../services/auth-service';
import { AlertService } from '../../services/alert-service';
import { Ledger as LedgerModel } from '../../models/ledger.model';
import { ChartOfAccount } from '../../models/chart-of-account.model';
import { CanDirective } from '../../directives/can.directive';

@Component({
  selector: 'app-ledger',
  imports: [ReactiveFormsModule, DecimalPipe, CanDirective],
  templateUrl: './ledger.html',
  styleUrl: './ledger.css',
  host: {
    // Close the group combobox when clicking anywhere outside it.
    '(document:click)': 'closeGroupDropdown()',
  },
})
export class Ledger {
  private fb = inject(FormBuilder);
  private service = inject(LedgerService);
  private accountService = inject(ChartOfAccountService);
  private auth = inject(AuthService);
  private alert = inject(AlertService);

  protected readonly ledgers = signal<LedgerModel[]>([]);
  protected readonly groups = signal<ChartOfAccount[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly search = signal('');

  // ---- opening-balance tabs ----
  protected readonly tab = signal<'all' | 'with' | 'without'>('all');

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  // ---- group combobox ----
  protected readonly groupOpen = signal(false);
  protected readonly groupSearch = signal('');
  protected readonly selectedGroup = signal<ChartOfAccount | null>(null);

  protected readonly filteredGroups = computed(() => {
    const term = this.groupSearch().trim().toLowerCase();
    const list = this.groups();
    if (!term) return list;
    return list.filter(g => g.name.toLowerCase().includes(term));
  });

  protected readonly form = this.fb.nonNullable.group({
    groupId: [null as number | null, Validators.required],
    ledgerName: ['', Validators.required],
    address: [''],
    phone: [''],
    email: ['', Validators.email],
    drOpeningBalance: [0, Validators.min(0)],
    crOpeningBalance: [0, Validators.min(0)],
    note: [''],
    isActive: [true],
  });

  /** Account name keyed by id, for resolving a ledger's group label. */
  private readonly groupNameById = computed(() => {
    const map = new Map<number, string>();
    for (const g of this.groups()) if (g.id != null) map.set(g.id, g.name);
    return map;
  });

  protected readonly filteredLedgers = computed(() => {
    const term = this.search().trim().toLowerCase();
    const tab = this.tab();
    return this.ledgers().filter(l => {
      if (tab === 'with' && !this.hasOpening(l)) return false;
      if (tab === 'without' && this.hasOpening(l)) return false;
      if (term && !l.ledgerName.toLowerCase().includes(term)) return false;
      return true;
    });
  });

  /** Totals reflect the rows currently shown for the active tab. */
  protected readonly totalDr = computed(() =>
    this.filteredLedgers().reduce((sum, l) => sum + (l.drOpeningBalance ?? 0), 0),
  );
  protected readonly totalCr = computed(() =>
    this.filteredLedgers().reduce((sum, l) => sum + (l.crOpeningBalance ?? 0), 0),
  );

  constructor() {
    this.loadLedgers();
    this.loadGroups();
  }

  groupName(ledger: LedgerModel): string {
    return ledger.groupName ?? this.groupNameById().get(ledger.groupId) ?? `#${ledger.groupId}`;
  }

  /** A ledger carries an opening balance when either side is non-zero. */
  private hasOpening(ledger: LedgerModel): boolean {
    return (ledger.drOpeningBalance ?? 0) !== 0 || (ledger.crOpeningBalance ?? 0) !== 0;
  }

  selectTab(tab: 'all' | 'with' | 'without') {
    this.tab.set(tab);
  }

  loadLedgers() {
    this.loading.set(true);
    this.error.set('');
    this.service.search({}).subscribe({
      next: result => {
        this.ledgers.set(result.items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load ledgers.');
        this.loading.set(false);
      },
    });
  }

  private loadGroups() {
    this.accountService.search({ onlyLeaf: true }).subscribe({
      next: data => this.groups.set(data ?? []),
      error: () => {},
    });
  }

  // ---- group combobox interactions ----
  toggleGroupDropdown(event: Event) {
    // Keep the click from reaching the document handler that closes the menu.
    event.stopPropagation();
    this.groupOpen.update(open => !open);
    if (this.groupOpen()) this.groupSearch.set('');
  }

  closeGroupDropdown() {
    this.groupOpen.set(false);
  }

  selectGroup(group: ChartOfAccount) {
    this.selectedGroup.set(group);
    this.form.controls.groupId.setValue(group.id ?? null);
    this.form.controls.groupId.markAsTouched();
    this.groupOpen.set(false);
  }

  // ---- form lifecycle ----
  openCreate() {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({
      groupId: null,
      ledgerName: '',
      address: '',
      phone: '',
      email: '',
      drOpeningBalance: 0,
      crOpeningBalance: 0,
      note: '',
      isActive: true,
    });
    this.selectedGroup.set(null);
    this.groupOpen.set(false);
    this.showForm.set(true);
  }

  openEdit(ledger: LedgerModel) {
    this.editingId.set(ledger.id ?? null);
    this.formError.set('');
    this.form.reset({
      groupId: ledger.groupId,
      ledgerName: ledger.ledgerName,
      address: ledger.address ?? '',
      phone: ledger.phone ?? '',
      email: ledger.email ?? '',
      drOpeningBalance: ledger.drOpeningBalance ?? 0,
      crOpeningBalance: ledger.crOpeningBalance ?? 0,
      note: ledger.note ?? '',
      isActive: ledger.isActive,
    });
    this.selectedGroup.set(this.groups().find(g => g.id === ledger.groupId) ?? null);
    this.groupOpen.set(false);
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const actor = this.actor();
    const id = this.editingId();
    const payload: LedgerModel = {
      groupId: v.groupId!,
      ledgerName: v.ledgerName.trim(),
      address: v.address.trim() || null,
      phone: v.phone.trim() || null,
      email: v.email.trim() || null,
      drOpeningBalance: v.drOpeningBalance,
      crOpeningBalance: v.crOpeningBalance,
      note: v.note.trim() || null,
      isActive: v.isActive,
    };
    if (id == null) {
      payload.postBy = actor;
    } else {
      payload.updateBy = actor;
    }

    this.saving.set(true);
    this.formError.set('');
    const request = id == null ? this.service.add(payload) : this.service.update(id, payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.alert.success(`Ledger ${id == null ? 'created' : 'updated'} successfully.`);
        this.loadLedgers();
      },
      error: () => {
        this.saving.set(false);
        this.formError.set('Failed to save the ledger.');
        this.alert.error('Failed to save the ledger.');
      },
    });
  }

  async remove(ledger: LedgerModel) {
    if (ledger.id == null) return;
    if (!(await this.alert.confirmDelete(`ledger "${ledger.ledgerName}"`))) return;
    this.service.delete(ledger.id).subscribe({
      next: () => {
        this.alert.success('Ledger deleted successfully.');
        this.loadLedgers();
      },
      error: () => {
        this.error.set('Failed to delete the ledger.');
        this.alert.error('Failed to delete the ledger.');
      },
    });
  }

  private actor(): string {
    const user = this.auth.getUser();
    return user?.userName ?? user?.username ?? 'admin';
  }
}
