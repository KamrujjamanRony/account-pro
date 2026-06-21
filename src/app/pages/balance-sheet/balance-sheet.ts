import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReportService } from '../../services/report-service';
import { ExcelCell, ExcelExportService } from '../../services/excel-export-service';
import { BalanceSheetLevel, BalanceSheetReport } from '../../models/report.model';

@Component({
  selector: 'app-balance-sheet',
  imports: [DecimalPipe],
  templateUrl: './balance-sheet.html',
  styleUrl: './balance-sheet.css',
})
export class BalanceSheet {
  private service = inject(ReportService);
  private excel = inject(ExcelExportService);

  protected readonly asOfDate = signal(this.today());
  protected readonly fiscalYearStart = signal(this.startOfYear());
  /** Group totals only, or group totals with their ledger detail. */
  protected readonly level = signal<BalanceSheetLevel>('group');

  protected readonly report = signal<BalanceSheetReport | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly hasRun = signal(false);

  protected readonly levelLabel = computed(() =>
    this.level() === 'detail' ? 'Sub Ledger' : 'Group',
  );

  /** The two sides in print order, for a single template loop. */
  protected readonly sides = computed(() => {
    const r = this.report();
    return r ? [r.assets, r.liabilities] : [];
  });

  protected readonly showLedgers = computed(() => this.level() === 'detail');

  /** True once a report with at least one populated section is available to print. */
  protected readonly canPrint = computed(() => {
    const r = this.report();
    return (
      !!r &&
      (r.assets.sections.some(s => s.groups.length > 0) ||
        r.liabilities.sections.some(s => s.groups.length > 0))
    );
  });

  constructor() {
    this.generate();
  }

  setLevel(level: BalanceSheetLevel) {
    this.level.set(level);
  }

  generate() {
    if (!this.asOfDate() || !this.fiscalYearStart()) {
      this.error.set('Please choose both an As-on date and a fiscal-year start.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.service
      .balanceSheet({ asOfDate: this.asOfDate(), fiscalYearStart: this.fiscalYearStart() })
      .subscribe({
        next: report => {
          this.report.set(report);
          this.loading.set(false);
          this.hasRun.set(true);
        },
        error: () => {
          this.error.set('Failed to load the Balance Sheet.');
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

    const showLedgers = this.showLedgers();
    const rows: ExcelCell[][] = [
      [r.companyName],
      [r.title],
      [`As on Date: ${this.fmtDate(r.asOfDate)} | Level: ${this.levelLabel()}`],
      [],
      ['Group', 'Amount'],
    ];

    for (const side of this.sides()) {
      rows.push([side.title]);
      for (const section of side.sections) {
        if (section.sectionName && section.sectionName !== side.title) {
          rows.push([section.sectionName]);
        }
        for (const group of section.groups) {
          rows.push([group.groupName, group.amount]);
          if (showLedgers) {
            for (const ledger of group.ledgers) rows.push([`    ${ledger.name}`, ledger.amount]);
          }
        }
        if (side.sections.length > 1) rows.push(['Sub Total :', section.subTotal]);
      }
      rows.push([`Summary for ${side.title} :`, side.summary]);
    }
    rows.push([]);
    rows.push(r.isBalanced ? ['Balanced.'] : ['Out of balance — Difference :', r.difference]);

    this.excel.download(`${r.title} as on ${r.asOfDate}`, rows, 'Balance Sheet');
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

  private startOfYear(): string {
    return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  }
}
