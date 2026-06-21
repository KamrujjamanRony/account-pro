import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReportService } from '../../services/report-service';
import { ChartOfAccountService } from '../../services/chart-of-account-service';
import { LedgerService } from '../../services/ledger-service';
import { CostCenterService } from '../../services/cost-center-service';
import { ExcelCell, ExcelExportService } from '../../services/excel-export-service';
import { GeneralLedgerReport } from '../../models/report.model';
import { SearchSelect, SelectOption } from '../../components/shared/search-select/search-select';

@Component({
  selector: 'app-general-ledger',
  imports: [DecimalPipe, SearchSelect],
  templateUrl: './general-ledger.html',
  styleUrl: './general-ledger.css',
})
export class GeneralLedger {
  private service = inject(ReportService);
  private accountService = inject(ChartOfAccountService);
  private ledgerService = inject(LedgerService);
  private costCenterService = inject(CostCenterService);
  private excel = inject(ExcelExportService);

  protected readonly fromDate = signal(this.startOfMonth());
  protected readonly toDate = signal(this.today());

  /** Filter selections; empty means "all". Groups & ledgers are multi-select. */
  protected readonly selectedGroups = signal<string[]>([]);
  protected readonly selectedLedgers = signal<string[]>([]);
  protected readonly selectedCostCenter = signal<string[]>([]);

  /** Dropdown option lists. */
  protected readonly groupOptions = signal<SelectOption[]>([]);
  protected readonly ledgerOptions = signal<SelectOption[]>([]);
  protected readonly costCenterOptions = signal<SelectOption[]>([]);

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
    this.loadFilterOptions();
    this.generate();
  }

  private loadFilterOptions() {
    this.accountService.search({ onlyLeaf: true }).subscribe({
      next: groups =>
        this.groupOptions.set(
          (groups ?? []).map(g => ({ value: g.name, label: g.name })),
        ),
      error: () => {},
    });
    this.ledgerService.searchList({ withoutCashAtBankAndCashInHand: false }).subscribe({
      next: result =>
        this.ledgerOptions.set(
          result.items.map(l => ({ value: l.ledgerName, label: l.ledgerName })),
        ),
      error: () => {},
    });
    this.costCenterService.search({ activeOnly: true }).subscribe({
      next: list =>
        this.costCenterOptions.set(list.map(c => ({ value: c.name, label: c.name }))),
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
      .generalLedger({
        fromDate: this.fromDate(),
        toDate: this.toDate(),
        groupName: this.selectedGroups().join(',') || null,
        ledger: this.selectedLedgers().join(',') || null,
        costCenter: this.selectedCostCenter()[0] ?? null,
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

  /** Export the current report to an .xlsx file mirroring the printed layout. */
  exportExcel() {
    const r = this.report();
    if (!r || !this.canPrint()) return;

    const balance = (value: number, side: string) => (side ? `${value.toFixed(2)} ${side}` : value.toFixed(2));

    const rows: ExcelCell[][] = [
      [r.companyName],
      [r.title],
      [`Date: ${this.fmtDate(r.fromDate)} to ${this.fmtDate(r.toDate)} | Cost Center: ${r.costCenter}`],
      [],
      ['Date', 'Vch. No.', 'Narration', 'Short Narration', 'Dr. Amount', 'Cr. Amount', 'Balance'],
    ];

    for (const group of r.groups) {
      rows.push([group.groupName]);
      for (const account of group.accounts) {
        rows.push([account.ledgerName]);
        for (const l of account.lines) {
          rows.push([
            this.fmtDate(l.date), l.voucherNo, l.narration, l.shortNarration,
            l.debit, l.credit, balance(l.balance, l.balanceSide),
          ]);
        }
        if (account.hasSubTotal) {
          rows.push(['Sub Total :', '', '', '', account.subTotalDebit, account.subTotalCredit, '']);
        }
      }
      rows.push([
        `Summary for ${group.groupName} :`, '', '', '',
        group.summaryDebit, group.summaryCredit, balance(group.closingBalance, group.closingSide),
      ]);
    }

    this.excel.download(`${r.title} ${r.fromDate} to ${r.toDate}`, rows, 'General Ledger');
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
