import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReportService } from '../../services/report-service';
import { ExcelCell, ExcelExportService } from '../../services/excel-export-service';
import { DayBookReport } from '../../models/report.model';
import { VOUCHER_TYPES } from '../../models/voucher.model';
import { SearchSelect, SelectOption } from '../../components/shared/search-select/search-select';

@Component({
  selector: 'app-day-book',
  imports: [DecimalPipe, SearchSelect],
  templateUrl: './day-book.html',
  styleUrl: './day-book.css',
})
export class DayBook {
  private service = inject(ReportService);
  private excel = inject(ExcelExportService);

  protected readonly fromDate = signal(this.startOfMonth());
  protected readonly toDate = signal(this.today());

  /** Voucher-type filter; empty means "all types". Single-select. */
  protected readonly selectedType = signal<string[]>([]);

  /** Type dropdown options (code → label), e.g. "CR — Cash Receipt". */
  protected readonly typeOptions: SelectOption[] = VOUCHER_TYPES.map(t => ({
    value: t.code,
    label: `${t.code} — ${t.label}`,
  }));

  protected readonly report = signal<DayBookReport | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly hasRun = signal(false);

  /** True once a report with at least one voucher is available to print. */
  protected readonly canPrint = computed(() => {
    const r = this.report();
    return !!r && r.sections.some(s => s.vouchers.length > 0);
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
      .dayBook({
        fromDate: this.fromDate(),
        toDate: this.toDate(),
        type: this.selectedType()[0] ?? null,
      })
      .subscribe({
        next: report => {
          this.report.set(report);
          this.loading.set(false);
          this.hasRun.set(true);
        },
        error: () => {
          this.error.set('Failed to load the Day Book.');
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
      [`Date: ${this.fmtDate(r.fromDate)} to ${this.fmtDate(r.toDate)}`],
      [],
      ['Group', 'Ledger', 'Short Narration', 'Dr. Amount', 'Cr. Amount'],
    ];

    for (const section of r.sections) {
      rows.push([section.sectionName]);
      for (const v of section.vouchers) {
        rows.push([
          `ID : ${v.voucherId} | Date : ${this.fmtDate(v.date)} | Type : ${v.type} | ` +
            `Reference : ${v.reference} | Cost Center : ${v.costCenter}`,
        ]);
        for (const d of v.details) {
          rows.push([d.groupName, d.ledgerName, d.shortNarration, d.debit, d.credit]);
        }
        rows.push(['Sub Total :', '', '', v.subTotalDebit, v.subTotalCredit]);
        rows.push([`Narration : ${v.narration}`]);
      }
      rows.push([
        `Summary for ${section.sectionName} :`, '', '', section.summaryDebit, section.summaryCredit,
      ]);
    }

    this.excel.download(`${r.title} ${r.fromDate} to ${r.toDate}`, rows, 'Day Book');
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
