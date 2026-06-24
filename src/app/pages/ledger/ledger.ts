import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, DOCUMENT } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LedgerService } from '../../services/ledger-service';
import { ChartOfAccountService } from '../../services/chart-of-account-service';
import { AuthService } from '../../services/auth-service';
import { AlertService } from '../../services/alert-service';
import { CompanyProfileService } from '../../services/company-profile-service';
import { ExcelCell, ExcelExportService } from '../../services/excel-export-service';
import { Ledger as LedgerModel, LedgerSearchQuery } from '../../models/ledger.model';
import { ChartOfAccount } from '../../models/chart-of-account.model';
import { CanDirective } from '../../directives/can.directive';
import { ReportHeader } from '../../components/shared/report-header/report-header';

@Component({
  selector: 'app-ledger',
  imports: [ReactiveFormsModule, DecimalPipe, CanDirective, ReportHeader],
  templateUrl: './ledger.html',
  styleUrl: './ledger.css',
  host: {
    // Close the group comboboxes when clicking anywhere outside them.
    '(document:click)': 'closeAllDropdowns()',
  },
})
export class Ledger {
  private fb = inject(FormBuilder);
  private service = inject(LedgerService);
  private accountService = inject(ChartOfAccountService);
  private auth = inject(AuthService);
  private alert = inject(AlertService);
  private excel = inject(ExcelExportService);
  private profileService = inject(CompanyProfileService);
  private document = inject(DOCUMENT);

  /** Active letterhead profile, for the Excel export's company line. */
  protected readonly profile = this.profileService.profile;

  protected readonly ledgers = signal<LedgerModel[]>([]);
  protected readonly groups = signal<ChartOfAccount[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly search = signal('');

  // ---- opening-balance tabs ----
  protected readonly tab = signal<'all' | 'with' | 'without'>('all');

  // ---- list group filter (server-side, multi-select) ----
  protected readonly filterGroupIds = signal<number[]>([]);
  protected readonly filterGroupOpen = signal(false);
  protected readonly filterGroupSearch = signal('');
  /** Index of the keyboard-highlighted option within filteredFilterGroups(). */
  protected readonly activeFilterGroupIndex = signal(0);

  protected readonly filteredFilterGroups = computed(() => {
    const term = this.filterGroupSearch().trim().toLowerCase();
    const list = this.groups();
    if (!term) return list;
    return list.filter(g => g.name.toLowerCase().includes(term));
  });

  /** Trigger label: group name when one is picked, a count when several. */
  protected readonly filterGroupLabel = computed(() => {
    const ids = this.filterGroupIds();
    if (ids.length === 0) return '';
    if (ids.length === 1) {
      return this.groups().find(g => g.id === ids[0])?.name ?? '1 group';
    }
    return `${ids.length} groups selected`;
  });

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  // ---- group combobox ----
  protected readonly groupOpen = signal(false);
  protected readonly groupSearch = signal('');
  protected readonly selectedGroup = signal<ChartOfAccount | null>(null);
  /** Index of the keyboard-highlighted option within filteredGroups(). */
  protected readonly activeGroupIndex = signal(0);

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
    if (!term) return this.ledgers();
    return this.ledgers().filter(l => l.ledgerName.toLowerCase().includes(term));
  });

  /** Totals reflect the rows currently shown for the active tab. */
  protected readonly totalDr = computed(() =>
    this.filteredLedgers().reduce((sum, l) => sum + (l.drOpeningBalance ?? 0), 0),
  );
  protected readonly totalCr = computed(() =>
    this.filteredLedgers().reduce((sum, l) => sum + (l.crOpeningBalance ?? 0), 0),
  );

  /** Something to print only when rows are currently shown. */
  protected readonly canPrint = computed(() => this.filteredLedgers().length > 0);

  /** Meta line under the printed/exported title, summarising the active filters. */
  protected readonly printMeta = computed(() => {
    const tab = this.tab();
    const parts: string[] = [
      tab === 'with'
        ? 'With opening balance'
        : tab === 'without'
          ? 'Without opening balance'
          : 'All ledgers',
    ];
    const ids = this.filterGroupIds();
    if (ids.length) {
      const names = this.groups()
        .filter(g => g.id != null && ids.includes(g.id))
        .map(g => g.name);
      if (names.length) parts.push(`Group: ${names.join(', ')}`);
    }
    const term = this.search().trim();
    if (term) parts.push(`Search: "${term}"`);
    return parts.join(' • ');
  });

  constructor() {
    this.loadLedgers();
    this.loadGroups();
  }

  groupName(ledger: LedgerModel): string {
    return ledger.groupName ?? this.groupNameById().get(ledger.groupId) ?? `#${ledger.groupId}`;
  }

  selectTab(tab: 'all' | 'with' | 'without') {
    if (this.tab() === tab) return;
    this.tab.set(tab);
    this.loadLedgers();
  }

  // ---- list group filter combobox (multi-select) ----
  isFilterGroupSelected(id: number | undefined): boolean {
    return id != null && this.filterGroupIds().includes(id);
  }

  toggleFilterGroupDropdown(event: Event) {
    // Keep the click from reaching the document handler that closes the menu.
    event.stopPropagation();
    if (this.filterGroupOpen()) {
      this.closeFilterGroupDropdown();
    } else {
      this.openFilterGroupDropdown();
    }
  }

  private openFilterGroupDropdown() {
    this.filterGroupOpen.set(true);
    this.filterGroupSearch.set('');
    this.activeFilterGroupIndex.set(0);
    this.focusAfterRender('ledger-filter-group-search');
  }

  closeFilterGroupDropdown() {
    this.filterGroupOpen.set(false);
  }

  /** Keyboard handling on the closed trigger: open on Enter / Space / ArrowDown. */
  onFilterGroupTriggerKeydown(event: KeyboardEvent) {
    if (this.filterGroupOpen()) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.openFilterGroupDropdown();
    }
  }

  onFilterGroupSearchInput(value: string) {
    this.filterGroupSearch.set(value);
    this.activeFilterGroupIndex.set(0);
  }

  /** Keyboard handling inside the open menu (focus stays on the search box). */
  onFilterGroupSearchKeydown(event: KeyboardEvent) {
    const groups = this.filteredFilterGroups();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeFilterGroupIndex.update(i => Math.min(i + 1, groups.length - 1));
        this.scrollActiveFilterGroupIntoView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeFilterGroupIndex.update(i => Math.max(i - 1, 0));
        this.scrollActiveFilterGroupIntoView();
        break;
      case 'Enter': {
        event.preventDefault();
        const group = groups[this.activeFilterGroupIndex()];
        if (group) this.toggleFilterGroup(group);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.closeFilterGroupDropdown();
        this.focusAfterRender('ledger-filter-group-trigger');
        break;
      case 'Tab':
        this.closeFilterGroupDropdown();
        break;
    }
  }

  private scrollActiveFilterGroupIntoView() {
    const el = this.document.getElementById(`ledger-filter-group-opt-${this.activeFilterGroupIndex()}`);
    el?.scrollIntoView({ block: 'nearest' });
  }

  /** Add or remove a group from the filter, then reload the list. */
  toggleFilterGroup(group: ChartOfAccount) {
    if (group.id == null) return;
    const id = group.id;
    this.filterGroupIds.update(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id],
    );
    this.loadLedgers();
  }

  clearFilterGroups(event: Event) {
    event.stopPropagation();
    if (this.filterGroupIds().length === 0) return;
    this.filterGroupIds.set([]);
    this.loadLedgers();
  }

  // ---- print / export ----
  print() {
    if (this.canPrint()) window.print();
  }

  /** Export the rows currently shown to an .xlsx mirroring the printed sheet. */
  exportExcel() {
    if (!this.canPrint()) return;
    const rows: ExcelCell[][] = [
      [this.profile().name],
      ['Ledger'],
      [this.printMeta()],
      [],
      ['Ledger', 'Group', 'Opening (Dr)', 'Opening (Cr)'],
    ];
    for (const l of this.filteredLedgers()) {
      rows.push([l.ledgerName, this.groupName(l), l.drOpeningBalance ?? 0, l.crOpeningBalance ?? 0]);
    }
    rows.push(['Total', '', this.totalDr(), this.totalCr()]);
    this.excel.download('Ledger', rows, 'Ledger');
  }

  loadLedgers() {
    this.loading.set(true);
    this.error.set('');
    // The active tab maps to the SearchOpening body: "all" omits withOpeningOnly,
    // "with"/"without" toggle it. The group filter scopes results server-side.
    const tab = this.tab();
    const query: LedgerSearchQuery = {};
    if (tab !== 'all') query.withOpeningOnly = tab === 'with';
    const groupIds = this.filterGroupIds();
    if (groupIds.length) query.groupId = groupIds;
    this.service
      .searchOpening(query)
      .subscribe({
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
    if (this.groupOpen()) this.openGroupDropdown();
  }

  /** Open the menu, reset the search, highlight the selected option and focus the search box. */
  private openGroupDropdown() {
    this.groupOpen.set(true);
    this.groupSearch.set('');
    const selectedId = this.selectedGroup()?.id;
    const idx = this.filteredGroups().findIndex(g => g.id === selectedId);
    this.activeGroupIndex.set(idx >= 0 ? idx : 0);
    this.focusAfterRender('ledger-group-search');
  }

  closeGroupDropdown() {
    this.groupOpen.set(false);
  }

  /** Document-click handler: dismiss any open combobox menu. */
  closeAllDropdowns() {
    this.groupOpen.set(false);
    this.filterGroupOpen.set(false);
  }

  /** Keyboard handling on the closed combobox trigger: open on Enter / Space / ArrowDown. */
  onGroupTriggerKeydown(event: KeyboardEvent) {
    if (this.groupOpen()) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.openGroupDropdown();
    }
  }

  onGroupSearchInput(value: string) {
    this.groupSearch.set(value);
    // Filtering changed the list; keep the highlight on a valid row.
    this.activeGroupIndex.set(0);
  }

  /** Keyboard handling inside the open menu (focus stays on the search box). */
  onGroupSearchKeydown(event: KeyboardEvent) {
    const groups = this.filteredGroups();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeGroupIndex.update(i => Math.min(i + 1, groups.length - 1));
        this.scrollActiveGroupIntoView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeGroupIndex.update(i => Math.max(i - 1, 0));
        this.scrollActiveGroupIntoView();
        break;
      case 'Enter': {
        event.preventDefault();
        const group = groups[this.activeGroupIndex()];
        if (group) this.selectGroup(group);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.closeGroupDropdown();
        this.focusAfterRender('ledger-group-trigger');
        break;
      case 'Tab':
        this.closeGroupDropdown();
        break;
    }
  }

  private scrollActiveGroupIntoView() {
    const el = this.document.getElementById(`ledger-group-opt-${this.activeGroupIndex()}`);
    el?.scrollIntoView({ block: 'nearest' });
  }

  selectGroup(group: ChartOfAccount) {
    this.selectedGroup.set(group);
    this.form.controls.groupId.setValue(group.id ?? null);
    this.form.controls.groupId.markAsTouched();
    this.groupOpen.set(false);
    // Selecting advances to the next field, per the keyboard flow.
    this.focusAfterRender('ledger-name');
  }

  // ---- keyboard form navigation ----
  /** Enter on a text field moves focus to the next field instead of submitting. */
  onFieldEnter(event: Event, nextId: string) {
    event.preventDefault();
    this.focusById(nextId);
  }

  /** Enter on the last field submits the form and lands focus on the Save button. */
  submitFromKeyboard(event: Event) {
    event.preventDefault();
    this.focusById('ledger-save');
    this.save();
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
    this.focusAfterRender('ledger-group-trigger');
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
    this.focusAfterRender('ledger-group-trigger');
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
