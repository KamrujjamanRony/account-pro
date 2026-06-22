import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReportService } from '../../services/report-service';
import { ExcelCell, ExcelExportService } from '../../services/excel-export-service';
import { BookKind, CashBookLine, CashBookReport } from '../../models/report.model';
import { ReportHeader } from '../../components/shared/report-header/report-header';

@Component({
  selector: 'app-cash-bank-book',
  imports: [DecimalPipe, RouterLink, ReportHeader],
  templateUrl: './cash-bank-book.html',
  styleUrl: './cash-bank-book.css',
})
export class CashBankBook {
  private route = inject(ActivatedRoute);
  private service = inject(ReportService);
  private excel = inject(ExcelExportService);

  /** 'cash' | 'bank' — supplied via route data, drives endpoint and labels. */
  protected readonly kind = signal<BookKind>(
    (this.route.snapshot.data['kind'] as BookKind) ?? 'cash',
  );

  protected readonly fromDate = signal(this.startOfMonth());
  protected readonly toDate = signal(this.today());

  protected readonly report = signal<CashBookReport | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly hasRun = signal(false);

  protected readonly title = computed(() => (this.kind() === 'cash' ? 'Cash Book' : 'Bank Book'));
  protected readonly subject = computed(() => (this.kind() === 'cash' ? 'Cash' : 'Bank'));
  protected readonly openingLabel = computed(() => `A. Opening ${this.subject()}`);
  protected readonly closingLabel = computed(() => `C. Closing ${this.subject()}`);

  /** True once a report with at least one section is available to print. */
  protected readonly canPrint = computed(() => {
    const r = this.report();
    return !!r && (r.opening.length > 0 || r.transactions.length > 0 || r.closing.length > 0);
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
    const query = { fromDate: this.fromDate(), toDate: this.toDate() };
    const request = this.kind() === 'cash' ? this.service.cashBook(query) : this.service.bankBook(query);
    request.subscribe({
      next: report => {
        this.report.set(report);
        this.loading.set(false);
        this.hasRun.set(true);
        console.log('Cash/Bank Book report:', this.report());
      },
      error: () => {
        this.error.set(`Failed to load the ${this.title().toLowerCase()}.`);
        this.report.set(null);
        this.loading.set(false);
        this.hasRun.set(true);
      },
    });
  }

  print() {
    if (this.canPrint()) window.print();
  }

  /** Export the current report to an .xlsx file mirroring the printed layout. */
  exportExcel() {
    const r = this.report();
    if (!r || !this.canPrint()) return;

    const line = (l: CashBookLine): ExcelCell[] => [
      this.fmtDate(l.date), l.voucherId, l.reference, l.ledger, l.narration, l.receipt, l.payment,
    ];

    const rows: ExcelCell[][] = [
      [r.companyName],
      [this.title()],
      [`Date: ${this.fmtDate(r.fromDate)} to ${this.fmtDate(r.toDate)}`],
      [],
      ['Date', 'ID', 'Reference', 'Ledger', 'Narration', 'Receipt', 'Payment'],
      [this.openingLabel()],
      ...r.opening.map(line),
      ['B. Receipt & Payment'],
      ...r.transactions.map(line),
      ['Sub Total :', '', '', '', '', r.subTotalReceipt, r.subTotalPayment],
      [this.closingLabel()],
      ...r.closing.map(line),
      ['Grand Total :', '', '', '', '', r.grandTotalReceipt, r.grandTotalPayment],
    ];

    this.excel.download(`${this.title()} ${r.fromDate} to ${r.toDate}`, rows, this.title());
  }

  /**
   * Format a date as dd/MM/yyyy. The API rows may carry ISO strings or already
   * be display-formatted, so unparseable values are returned unchanged.
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
