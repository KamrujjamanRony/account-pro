import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReportService } from '../../services/report-service';
import { ChartOfAccountService } from '../../services/chart-of-account-service';
import { LedgerService } from '../../services/ledger-service';
import { ExcelCell, ExcelExportService } from '../../services/excel-export-service';
import { TrialBalanceReport, TrialBalanceTotals } from '../../models/report.model';
import { SearchSelect, SelectOption } from '../../components/shared/search-select/search-select';
import { ReportHeader } from '../../components/shared/report-header/report-header';

@Component({
  selector: 'app-trial-balance',
  imports: [DecimalPipe, SearchSelect, ReportHeader],
  templateUrl: './trial-balance.html',
  styleUrl: './trial-balance.css',
})
export class TrialBalance {
  private service = inject(ReportService);
  private accountService = inject(ChartOfAccountService);
  private ledgerService = inject(LedgerService);
  private excel = inject(ExcelExportService);

  protected readonly fromDate = signal(this.startOfMonth());
  protected readonly toDate = signal(this.today());

  /** Filter selections; empty means "all". Group & ledger are single-select. */
  protected readonly selectedGroups = signal<string[]>([]);
  protected readonly selectedLedgers = signal<string[]>([]);

  /** Dropdown option lists. */
  protected readonly groupOptions = signal<SelectOption[]>([]);
  protected readonly ledgerOptions = signal<SelectOption[]>([]);

  protected readonly report = signal<TrialBalanceReport | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly hasRun = signal(false);

  /** True once a report with at least one populated section is available to print. */
  protected readonly canPrint = computed(() => {
    const r = this.report();
    return !!r && r.sections.some(s => s.groups.length > 0);
  });

  constructor() {
    this.loadFilterOptions();
    this.generate();
  }

  private loadFilterOptions() {
    this.accountService.search({ onlyLeaf: true }).subscribe({
      next: groups =>
        this.groupOptions.set((groups ?? []).map(g => ({ value: g.name, label: g.name }))),
      error: () => {},
    });
    this.ledgerService.searchList({ withoutCashAtBankAndCashInHand: false }).subscribe({
      next: result =>
        this.ledgerOptions.set(result.items.map(l => ({ value: l.ledgerName, label: l.ledgerName }))),
      error: () => {},
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
      .trialBalance({
        fromDate: this.fromDate(),
        toDate: this.toDate(),
        groupName: this.selectedGroups()[0] ?? null,
        ledger: this.selectedLedgers()[0] ?? null,
      })
      .subscribe({
        next: report => {
          this.report.set(report);
          this.loading.set(false);
          this.hasRun.set(true);
        },
        error: () => {
          this.error.set('Failed to load the Trial Balance.');
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

    const cols = (t: TrialBalanceTotals): ExcelCell[] => [
      t.opening.debit, t.opening.credit, t.period.debit, t.period.credit, t.closing.debit, t.closing.credit,
    ];

    const rows: ExcelCell[][] = [
      [r.companyName],
      [r.title],
      [`Date: ${this.fmtDate(r.fromDate)} to ${this.fmtDate(r.toDate)}`],
      [],
      ['', 'Opening Balance', '', 'Current Balance', '', 'Closing Balance', ''],
      ['Ledger', 'Debit', 'Credit', 'Debit', 'Credit', 'Debit', 'Credit'],
    ];

    for (const section of r.sections) {
      rows.push([section.nature]);
      for (const group of section.groups) {
        rows.push([group.groupName]);
        for (const l of group.lines) rows.push([l.ledgerName, ...cols(l)]);
        rows.push(['Sub Total :', ...cols(group.subTotal)]);
      }
      rows.push([`Summary for ${section.nature} :`, ...cols(section.total)]);
    }
    rows.push(['Grand Total :', ...cols(r.grandTotal)]);

    this.excel.download(`${r.title} ${r.fromDate} to ${r.toDate}`, rows, 'Trial Balance');
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
