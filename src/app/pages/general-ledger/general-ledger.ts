import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReportService } from '../../services/report-service';
import { GeneralLedgerReport } from '../../models/report.model';

@Component({
  selector: 'app-general-ledger',
  imports: [DecimalPipe],
  templateUrl: './general-ledger.html',
  styleUrl: './general-ledger.css',
})
export class GeneralLedger {
  private service = inject(ReportService);

  protected readonly fromDate = signal(this.startOfMonth());
  protected readonly toDate = signal(this.today());
  /** Optional filters; blank means "all". */
  protected readonly groupName = signal('');
  protected readonly ledger = signal('');
  protected readonly costCenter = signal('');

  protected readonly report = signal<GeneralLedgerReport | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly hasRun = signal(false);

  /** True once a report with at least one populated group is available to print. */
  protected readonly canPrint = computed(() => {
    const r = this.report();
    return !!r && r.groups.some(g => g.accounts.length > 0);
  });

  constructor() {
    this.generate();
  }

  generate() {
    if (!this.fromDate() || !this.toDate()) {
      this.error.set('Please choose both a From and To date.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.service
      .generalLedger({
        fromDate: this.fromDate(),
        toDate: this.toDate(),
        groupName: this.groupName().trim() || null,
        ledger: this.ledger().trim() || null,
        costCenter: this.costCenter().trim() || null,
      })
      .subscribe({
        next: report => {
          this.report.set(report);
          this.loading.set(false);
          this.hasRun.set(true);
        },
        error: () => {
          this.error.set('Failed to load the General Ledger.');
          this.report.set(null);
          this.loading.set(false);
          this.hasRun.set(true);
        },
      });
  }

  print() {
    if (this.canPrint()) window.print();
  }

  /**
   * Format a date as dd/MM/yyyy. The API may return ISO strings or already
   * display-formatted values, so unparseable values are returned unchanged.
   */
  fmtDate(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private startOfMonth(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  }
}
