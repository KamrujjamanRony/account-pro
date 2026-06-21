import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReportService } from '../../services/report-service';
import { LedgerService } from '../../services/ledger-service';
import { ExcelCell, ExcelExportService } from '../../services/excel-export-service';
import { ReceiptPaymentStatement, RpsSection } from '../../models/report.model';

@Component({
  selector: 'app-receipt-payment-statement',
  imports: [DecimalPipe],
  templateUrl: './receipt-payment-statement.html',
  styleUrl: './receipt-payment-statement.css',
})
export class ReceiptPaymentStatementPage {
  private service = inject(ReportService);
  private ledgerService = inject(LedgerService);
  private excel = inject(ExcelExportService);

  protected readonly fromDate = signal(this.startOfMonth());
  protected readonly toDate = signal(this.today());

  protected readonly report = signal<ReceiptPaymentStatement | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly hasRun = signal(false);

  /**
   * Map of ledger code → ledger name. The statement's opening/closing rows come
   * back tagged by chart-of-account code (e.g. "1-01-03-01.0001"), so we resolve
   * those to readable names here. Empty until the ledger list loads.
   */
  private readonly ledgerNames = signal<Map<string, string>>(new Map());

  /**
   * Sections in print order, with each line's ledger resolved to a readable name
   * when the value is a known code. Drives a single @for in the template.
   */
  protected readonly sections = computed<RpsSection[]>(() => {
    const r = this.report();
    if (!r) return [];
    const names = this.ledgerNames();
    const resolve = (section: RpsSection): RpsSection => ({
      ...section,
      groups: section.groups.map(group => ({
        ...group,
        lines: group.lines.map(line => ({
          ...line,
          ledger: names.get(line.ledger) ?? line.ledger,
        })),
      })),
    });
    return [r.openingCashBank, r.receiptPayment, r.closingCashBank].map(resolve);
  });

  /** True once a report with at least one populated section is available to print. */
  protected readonly canPrint = computed(() =>
    this.sections().some(s => s.groups.length > 0),
  );

  constructor() {
    this.loadLedgerNames();
    this.generate();
  }

  private loadLedgerNames() {
    this.ledgerService.search().subscribe({
      next: result => {
        const map = new Map<string, string>();
        for (const ledger of result.items) {
          if (ledger.code) map.set(ledger.code, ledger.ledgerName);
        }
        this.ledgerNames.set(map);
      },
      error: () => {
        // Leave the map empty; lines fall back to showing their raw code.
      },
    });
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

  /** Export the current report to an .xlsx file mirroring the printed layout. */
  exportExcel() {
    const r = this.report();
    if (!r || !this.canPrint()) return;

    const rows: ExcelCell[][] = [
      [r.companyName],
      [r.title],
      [`Date: ${this.fmtDate(r.fromDate)} to ${this.fmtDate(r.toDate)}${r.option ? ` | Option: ${r.option}` : ''}`],
      [],
      ['Ledger', 'Receipt', 'Payment'],
    ];

    for (const section of this.sections()) {
      rows.push([section.sectionTitle]);
      for (const group of section.groups) {
        rows.push([group.groupName]);
        for (const l of group.lines) rows.push([l.ledger, l.receipt, l.payment]);
        if (group.lines.length > 1) {
          rows.push(['Sub Total :', group.subTotalReceipt, group.subTotalPayment]);
        }
      }
      rows.push([`Summary for ${section.sectionTitle} :`, section.summaryReceipt, section.summaryPayment]);
    }
    rows.push(['Grand Total :', r.grandTotalReceipt, r.grandTotalPayment]);

    this.excel.download(`${r.title} ${r.fromDate} to ${r.toDate}`, rows, 'Receipt & Payment');
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
