import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReportService } from '../../services/report-service';
import { ReceiptPaymentStatement } from '../../models/report.model';

@Component({
  selector: 'app-receipt-payment-statement',
  imports: [DecimalPipe],
  templateUrl: './receipt-payment-statement.html',
  styleUrl: './receipt-payment-statement.css',
})
export class ReceiptPaymentStatementPage {
  private service = inject(ReportService);

  protected readonly fromDate = signal(this.startOfMonth());
  protected readonly toDate = signal(this.today());

  protected readonly report = signal<ReceiptPaymentStatement | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly hasRun = signal(false);

  /** Sections in print order, for a single @for in the template. */
  protected readonly sections = computed(() => {
    const r = this.report();
    return r ? [r.openingCashBank, r.receiptPayment, r.closingCashBank] : [];
  });

  /** True once a report with at least one populated section is available to print. */
  protected readonly canPrint = computed(() =>
    this.sections().some(s => s.groups.length > 0),
  );

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
      .receiptPaymentStatement({ fromDate: this.fromDate(), toDate: this.toDate() })
      .subscribe({
        next: report => {
          this.report.set(report);
          this.loading.set(false);
          this.hasRun.set(true);
        },
        error: () => {
          this.error.set('Failed to load the Receipt & Payment Statement.');
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
