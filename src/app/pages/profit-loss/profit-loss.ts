import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReportService } from '../../services/report-service';
import { CostCenterService } from '../../services/cost-center-service';
import { ExcelCell, ExcelExportService } from '../../services/excel-export-service';
import { ProfitLossLevel, ProfitLossReport, ProfitLossRow } from '../../models/report.model';
import { SearchSelect, SelectOption } from '../../components/shared/search-select/search-select';

@Component({
  selector: 'app-profit-loss',
  imports: [DecimalPipe, SearchSelect],
  templateUrl: './profit-loss.html',
  styleUrl: './profit-loss.css',
})
export class ProfitLoss {
  private service = inject(ReportService);
  private costCenterService = inject(CostCenterService);
  private excel = inject(ExcelExportService);

  protected readonly fromDate = signal(this.startOfYear());
  protected readonly toDate = signal(this.today());
  /** Group totals only, or group totals with their ledger detail. */
  protected readonly level = signal<ProfitLossLevel>('Group');

  /** Cost-center filter; empty means "all". Single-select. */
  protected readonly selectedCostCenter = signal<string[]>([]);
  protected readonly costCenterOptions = signal<SelectOption[]>([]);

  protected readonly report = signal<ProfitLossReport | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly hasRun = signal(false);

  /** True once a report with at least one row is available to print. */
  protected readonly canPrint = computed(() => {
    const r = this.report();
    return !!r && r.rows.length > 0;
  });

  /** Emphasis classes per row kind, applied to the row (cells inherit color/weight). */
  private readonly kindClasses: Record<ProfitLossRow['kind'], string> = {
    section: 'pt-4 pb-1 font-bold text-neutral-800 italic',
    group: 'border-t border-neutral-200 text-neutral-700',
    ledger: 'border-t border-neutral-100 text-neutral-500 italic',
    subtotal: 'border-t border-neutral-300 font-bold text-neutral-900',
    summary: 'border-t-2 border-neutral-300 font-bold text-neutral-900 italic',
    net: 'border-t-2 border-neutral-700 font-bold text-neutral-900',
  };

  constructor() {
    this.loadCostCenters();
    this.generate();
  }

  private loadCostCenters() {
    this.costCenterService.search({ activeOnly: true }).subscribe({
      next: list => this.costCenterOptions.set(list.map(c => ({ value: c.name, label: c.name }))),
      error: () => {},
    });
  }

  setLevel(level: ProfitLossLevel) {
    if (this.level() === level) return;
    this.level.set(level);
    // Level is a server-side parameter, so re-fetch with the new detail level.
    this.generate();
  }

  /** Classes for a row; section headings render without amounts. */
  rowClasses(row: ProfitLossRow): string {
    return this.kindClasses[row.kind];
  }

  /** Section headings have no figures of their own; their cells stay blank. */
  showAmounts(row: ProfitLossRow): boolean {
    return row.kind !== 'section';
  }

  generate() {
    if (!this.fromDate() || !this.toDate()) {
      this.error.set('Please choose both a From and To date.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.service
      .profitLoss({
        fromDate: this.fromDate(),
        toDate: this.toDate(),
        costCenter: this.selectedCostCenter()[0] ?? null,
        level: this.level(),
      })
      .subscribe({
        next: report => {
          this.report.set(report);
          this.loading.set(false);
          this.hasRun.set(true);
        },
        error: () => {
          this.error.set('Failed to load the Profit & Loss Account.');
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
      [
        `Date: ${this.fmtDate(r.fromDate)} to ${this.fmtDate(r.toDate)} | ` +
          `Cost Center: ${r.costCenter} | Level: ${r.level}`,
      ],
      [],
      ['Group', 'Upto Previous', 'Current Period', 'Amount'],
    ];

    for (const row of r.rows) {
      const label = `${'    '.repeat(row.level)}${row.label}`;
      if (this.showAmounts(row)) {
        rows.push([label, row.uptoPrevious, row.currentPeriod, row.amount]);
      } else {
        rows.push([label]);
      }
    }

    this.excel.download(`${r.title} ${r.fromDate} to ${r.toDate}`, rows, 'Profit & Loss');
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
