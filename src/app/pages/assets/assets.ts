import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, DOCUMENT } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AssetService } from '../../services/asset-service';
import { LedgerService } from '../../services/ledger-service';
import { AuthService } from '../../services/auth-service';
import { AlertService } from '../../services/alert-service';
import { Asset, DepreciationMethod } from '../../models/asset.model';
import { Ledger } from '../../models/ledger.model';
import { CanDirective } from '../../directives/can.directive';

type StatusTab = 'all' | 'Active' | 'Disposed';

@Component({
  selector: 'app-assets',
  imports: [ReactiveFormsModule, DecimalPipe, CanDirective],
  templateUrl: './assets.html',
})
export class Assets {
  private fb = inject(FormBuilder);
  private service = inject(AssetService);
  private ledgerService = inject(LedgerService);
  private auth = inject(AuthService);
  private alert = inject(AlertService);
  private document = inject(DOCUMENT);

  protected readonly assets = signal<Asset[]>([]);
  protected readonly ledgers = signal<Ledger[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly search = signal('');
  protected readonly tab = signal<StatusTab>('Active');

  // ---- create / edit form ----
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly method = signal<DepreciationMethod>('SL');

  // ---- run depreciation dialog ----
  protected readonly showDepForm = signal(false);
  protected readonly running = signal(false);
  protected readonly depError = signal('');

  // ---- dispose dialog ----
  protected readonly showDisposeForm = signal(false);
  protected readonly disposing = signal(false);
  protected readonly disposeError = signal('');
  protected readonly disposeAsset = signal<Asset | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    assetName: ['', Validators.required],
    category: [''],
    location: [''],
    serialNo: [''],
    assetLedgerId: [null as number | null, Validators.required],
    accumulatedDepLedgerId: [null as number | null, Validators.required],
    depExpenseLedgerId: [null as number | null, Validators.required],
    purchaseDate: [this.today(), Validators.required],
    depreciationStartDate: [this.today(), Validators.required],
    cost: [0, [Validators.required, Validators.min(0)]],
    salvageValue: [0, [Validators.min(0)]],
    method: ['SL' as DepreciationMethod, Validators.required],
    usefulLifeMonths: [0, [Validators.min(0)]],
    ratePercent: [0, [Validators.min(0), Validators.max(100)]],
    note: [''],
    isActive: [true],
  });

  protected readonly depForm = this.fb.nonNullable.group({
    asOfDate: [this.today(), Validators.required],
    assetId: [null as number | null],
  });

  protected readonly disposeForm = this.fb.nonNullable.group({
    disposalDate: [this.today(), Validators.required],
    disposalAmount: [0, [Validators.required, Validators.min(0)]],
    receivedInLedgerId: [null as number | null, Validators.required],
    gainLossLedgerId: [null as number | null, Validators.required],
    depreciateUpToDisposal: [true],
  });

  protected readonly filteredAssets = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.tab();
    return this.assets().filter(a => {
      if (status !== 'all' && (a.status ?? 'Active') !== status) return false;
      if (!term) return true;
      return (
        a.assetName.toLowerCase().includes(term) ||
        (a.category ?? '').toLowerCase().includes(term) ||
        (a.serialNo ?? '').toLowerCase().includes(term)
      );
    });
  });

  protected readonly totals = computed(() => {
    const rows = this.filteredAssets();
    return rows.reduce(
      (acc, a) => {
        acc.cost += a.cost ?? 0;
        acc.accumulated += a.accumulatedDepreciation ?? 0;
        acc.netBook += a.netBookValue ?? (a.cost ?? 0) - (a.accumulatedDepreciation ?? 0);
        return acc;
      },
      { cost: 0, accumulated: 0, netBook: 0 },
    );
  });

  constructor() {
    this.loadAssets();
    this.loadLedgers();
  }

  loadAssets() {
    this.loading.set(true);
    this.error.set('');
    this.service.search({}).subscribe({
      next: items => {
        this.assets.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load assets.');
        this.loading.set(false);
      },
    });
  }

  private loadLedgers() {
    this.ledgerService.searchList({}).subscribe({
      next: res => this.ledgers.set(res.items),
      error: () => this.ledgers.set([]),
    });
  }

  setTab(tab: StatusTab) {
    this.tab.set(tab);
  }

  ledgerName(id: number | null | undefined): string {
    if (id == null) return '';
    return this.ledgers().find(l => l.id === id)?.ledgerName ?? '';
  }

  // ---- create / edit ----
  openCreate() {
    this.editingId.set(null);
    this.formError.set('');
    this.method.set('SL');
    this.form.reset({
      assetName: '',
      category: '',
      location: '',
      serialNo: '',
      assetLedgerId: null,
      accumulatedDepLedgerId: null,
      depExpenseLedgerId: null,
      purchaseDate: this.today(),
      depreciationStartDate: this.today(),
      cost: 0,
      salvageValue: 0,
      method: 'SL',
      usefulLifeMonths: 0,
      ratePercent: 0,
      note: '',
      isActive: true,
    });
    this.showForm.set(true);
  }

  openEdit(asset: Asset) {
    if (asset.id == null) return;
    this.editingId.set(asset.id);
    this.formError.set('');
    this.method.set((asset.method as DepreciationMethod) ?? 'SL');
    this.form.reset({
      assetName: asset.assetName,
      category: asset.category ?? '',
      location: asset.location ?? '',
      serialNo: asset.serialNo ?? '',
      assetLedgerId: asset.assetLedgerId ?? null,
      accumulatedDepLedgerId: asset.accumulatedDepLedgerId ?? null,
      depExpenseLedgerId: asset.depExpenseLedgerId ?? null,
      purchaseDate: (asset.purchaseDate ?? '').slice(0, 10) || this.today(),
      depreciationStartDate: (asset.depreciationStartDate ?? '').slice(0, 10) || this.today(),
      cost: asset.cost ?? 0,
      salvageValue: asset.salvageValue ?? 0,
      method: (asset.method as DepreciationMethod) ?? 'SL',
      usefulLifeMonths: asset.usefulLifeMonths ?? 0,
      ratePercent: asset.ratePercent ?? 0,
      note: asset.note ?? '',
      isActive: asset.isActive ?? true,
    });
    this.showForm.set(true);
  }

  onMethodChange(value: string) {
    this.method.set(value === 'WDV' ? 'WDV' : 'SL');
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
    const payload: Asset = {
      assetName: v.assetName.trim(),
      category: v.category.trim() || null,
      location: v.location.trim() || null,
      serialNo: v.serialNo.trim() || null,
      assetLedgerId: Number(v.assetLedgerId),
      accumulatedDepLedgerId: Number(v.accumulatedDepLedgerId),
      depExpenseLedgerId: Number(v.depExpenseLedgerId),
      purchaseDate: v.purchaseDate,
      depreciationStartDate: v.depreciationStartDate,
      cost: Number(v.cost),
      salvageValue: Number(v.salvageValue),
      method: v.method,
      usefulLifeMonths: Number(v.usefulLifeMonths),
      ratePercent: Number(v.ratePercent),
      note: v.note.trim() || null,
      isActive: v.isActive,
    };
    if (id == null) payload.postBy = actor;
    else payload.updateBy = actor;

    this.saving.set(true);
    this.formError.set('');
    const request = id == null ? this.service.add(payload) : this.service.update(id, payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.alert.success(`Asset ${id == null ? 'created' : 'updated'} successfully.`);
        this.loadAssets();
      },
      error: () => {
        this.saving.set(false);
        this.formError.set('Failed to save the asset.');
        this.alert.error('Failed to save the asset.');
      },
    });
  }

  async remove(asset: Asset) {
    if (asset.id == null) return;
    if (!(await this.alert.confirmDelete(`asset "${asset.assetName}"`))) return;
    this.service.delete(asset.id).subscribe({
      next: () => {
        this.alert.success('Asset deleted successfully.');
        this.loadAssets();
      },
      error: () => this.alert.error('Failed to delete the asset.'),
    });
  }

  // ---- run depreciation ----
  openRunDepreciation(asset?: Asset) {
    this.depError.set('');
    this.depForm.reset({ asOfDate: this.today(), assetId: asset?.id ?? null });
    this.showDepForm.set(true);
  }

  closeRunDepreciation() {
    this.showDepForm.set(false);
  }

  runDepreciation() {
    if (this.depForm.invalid) {
      this.depForm.markAllAsTouched();
      return;
    }
    const v = this.depForm.getRawValue();
    this.running.set(true);
    this.depError.set('');
    this.service
      .runDepreciation({ asOfDate: v.asOfDate, assetId: v.assetId, postBy: this.actor() })
      .subscribe({
        next: () => {
          this.running.set(false);
          this.showDepForm.set(false);
          this.alert.success('Depreciation posted successfully.');
          this.loadAssets();
        },
        error: () => {
          this.running.set(false);
          this.depError.set('Failed to run depreciation.');
          this.alert.error('Failed to run depreciation.');
        },
      });
  }

  // ---- dispose ----
  openDispose(asset: Asset) {
    if (asset.id == null) return;
    this.disposeAsset.set(asset);
    this.disposeError.set('');
    this.disposeForm.reset({
      disposalDate: this.today(),
      disposalAmount: 0,
      receivedInLedgerId: null,
      gainLossLedgerId: null,
      depreciateUpToDisposal: true,
    });
    this.showDisposeForm.set(true);
  }

  closeDispose() {
    this.showDisposeForm.set(false);
  }

  confirmDispose() {
    const asset = this.disposeAsset();
    if (!asset?.id) return;
    if (this.disposeForm.invalid) {
      this.disposeForm.markAllAsTouched();
      return;
    }
    const v = this.disposeForm.getRawValue();
    this.disposing.set(true);
    this.disposeError.set('');
    this.service
      .dispose(asset.id, {
        disposalDate: v.disposalDate,
        disposalAmount: Number(v.disposalAmount),
        receivedInLedgerId: Number(v.receivedInLedgerId),
        gainLossLedgerId: Number(v.gainLossLedgerId),
        depreciateUpToDisposal: v.depreciateUpToDisposal,
        postBy: this.actor(),
      })
      .subscribe({
        next: () => {
          this.disposing.set(false);
          this.showDisposeForm.set(false);
          this.alert.success('Asset disposed successfully.');
          this.loadAssets();
        },
        error: () => {
          this.disposing.set(false);
          this.disposeError.set('Failed to dispose the asset.');
          this.alert.error('Failed to dispose the asset.');
        },
      });
  }

  protected isDisposed(asset: Asset): boolean {
    return (asset.status ?? 'Active') === 'Disposed';
  }

  protected netBook(asset: Asset): number {
    return asset.netBookValue ?? (asset.cost ?? 0) - (asset.accumulatedDepreciation ?? 0);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private actor(): string {
    const user = this.auth.getUser();
    return user?.userName ?? user?.username ?? 'admin';
  }
}
