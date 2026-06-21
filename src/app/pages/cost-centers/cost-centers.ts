import { Component, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CostCenterService } from '../../services/cost-center-service';
import { AuthService } from '../../services/auth-service';
import { AlertService } from '../../services/alert-service';
import { CostCenter } from '../../models/cost-center.model';
import { CanDirective } from '../../directives/can.directive';

@Component({
  selector: 'app-cost-centers',
  imports: [ReactiveFormsModule, CanDirective],
  templateUrl: './cost-centers.html',
})
export class CostCenters {
  private fb = inject(FormBuilder);
  private service = inject(CostCenterService);
  private auth = inject(AuthService);
  private alert = inject(AlertService);
  private document = inject(DOCUMENT);

  protected readonly costCenters = signal<CostCenter[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly search = signal('');

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    note: [''],
    isActive: [true],
  });

  protected readonly filteredCostCenters = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.costCenters();
    return this.costCenters().filter(
      c =>
        c.name.toLowerCase().includes(term) ||
        (c.code ?? '').toLowerCase().includes(term),
    );
  });

  constructor() {
    this.loadCostCenters();
  }

  loadCostCenters() {
    this.loading.set(true);
    this.error.set('');
    this.service.search({
      "activeOnly": true
    }).subscribe({
      next: items => {
        this.costCenters.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load cost centers.');
        this.loading.set(false);
      },
    });
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
    this.focusById('cost-center-save');
    this.save();
  }

  private focusById(id: string) {
    (this.document.getElementById(id) as HTMLElement | null)?.focus();
  }

  private focusAfterRender(id: string) {
    requestAnimationFrame(() => this.focusById(id));
  }

  // ---- form lifecycle ----
  openCreate() {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({ code: '', name: '', note: '', isActive: true });
    this.showForm.set(true);
    this.focusAfterRender('cost-center-code');
  }

  openEdit(costCenter: CostCenter) {
    this.editingId.set(costCenter.id ?? null);
    this.formError.set('');
    this.form.reset({
      code: costCenter.code ?? '',
      name: costCenter.name,
      note: costCenter.note ?? '',
      isActive: costCenter.isActive,
    });
    this.showForm.set(true);
    this.focusAfterRender('cost-center-code');
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
    const payload: CostCenter = {
      code: v.code.trim(),
      name: v.name.trim(),
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
        this.alert.success(`Cost center ${id == null ? 'created' : 'updated'} successfully.`);
        this.loadCostCenters();
      },
      error: () => {
        this.saving.set(false);
        this.formError.set('Failed to save the cost center.');
        this.alert.error('Failed to save the cost center.');
      },
    });
  }

  async remove(costCenter: CostCenter) {
    if (costCenter.id == null) return;
    if (!(await this.alert.confirmDelete(`cost center "${costCenter.name}"`))) return;
    this.service.delete(costCenter.id).subscribe({
      next: () => {
        this.alert.success('Cost center deleted successfully.');
        this.loadCostCenters();
      },
      error: () => {
        this.error.set('Failed to delete the cost center.');
        this.alert.error('Failed to delete the cost center.');
      },
    });
  }

  private actor(): string {
    const user = this.auth.getUser();
    return user?.userName ?? user?.username ?? 'admin';
  }
}
