import { ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { LedgerService } from '../../services/ledger-service';
import { CostCenterService } from '../../services/cost-center-service';
import { VoucherService } from '../../services/voucher-service';
import { ExcelCell, ExcelExportService } from '../../services/excel-export-service';
import { Voucher as VoucherModel, VOUCHER_TYPES } from '../../models/voucher.model';
import { Ledger } from '../../models/ledger.model';
import { CostCenter } from '../../models/cost-center.model';
import { ReportHeader } from '../../components/shared/report-header/report-header';
import { Barcode } from '../../components/shared/barcode/barcode';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-voucher-print',
  imports: [DecimalPipe, ReportHeader, Barcode],
  templateUrl: './voucher-print.html',
  styleUrl: './voucher-print.css',
})
export class VoucherPrint {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private service = inject(VoucherService);
  private ledgerService = inject(LedgerService);
  private costCenterService = inject(CostCenterService);
  private excel = inject(ExcelExportService);
  private cdr = inject(ChangeDetectorRef);

  protected readonly types = VOUCHER_TYPES;

  /** Company name & address shown on the printed voucher letterhead. */
  protected readonly companyName = environment.companyName;
  protected readonly companyAddress = environment.companyAddress;

  protected readonly voucher = signal<VoucherModel | null>(null);
  protected readonly ledgers = signal<Ledger[]>([]);
  protected readonly costCenters = signal<CostCenter[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly totalDebit = computed(() =>
    (this.voucher()?.details ?? []).reduce((sum, d) => sum + (Number(d.debit) || 0), 0),
  );
  protected readonly totalCredit = computed(() =>
    (this.voucher()?.details ?? []).reduce((sum, d) => sum + (Number(d.credit) || 0), 0),
  );

  /** The voucher total spelled out for the printed "In Word" line. */
  protected readonly amountInWords = computed(() => this.numberToWords(this.totalDebit()));

  protected readonly ledgerNameById = computed(() => {
    const map = new Map<number, string>();
    for (const l of this.ledgers()) if (l.id != null) map.set(l.id, l.ledgerName);
    return map;
  });

  /** True once a voucher with details is loaded and ready to print. */
  protected readonly canPrint = computed(() => {
    const v = this.voucher();
    return !!v && (v.details ?? []).length > 0;
  });

  constructor() {
    this.loadLedgers();
    this.loadCostCenters();
    const vno = this.route.snapshot.paramMap.get('vno');
    if (vno) {
      this.loadByVoucherNo(vno);
    } else {
      this.error.set('No voucher specified.');
      this.loading.set(false);
    }
  }

  /**
   * Resolve a voucher by its number (or numeric id fallback), then fetch its
   * full detail. The voucher list links by id and the cash/bank books link by
   * voucher number, so both forms are accepted.
   */
  private loadByVoucherNo(voucherNo: string) {
    const target = voucherNo.trim().toLowerCase();
    this.loading.set(true);
    this.error.set('');
    this.service.search({}).subscribe({
      next: result => {
        const match = result.items.find(
          v =>
            String(v.voucherNo ?? '').trim().toLowerCase() === target ||
            String(v.id ?? '') === target,
        );
        if (!match || match.id == null) {
          this.error.set(`Voucher "${voucherNo}" was not found.`);
          this.loading.set(false);
          return;
        }
        // The list row may not carry detail lines, so fetch the full voucher.
        this.service.getById(match.id).subscribe({
          next: full => {
            this.voucher.set(full);
            this.loading.set(false);
            this.cdr.markForCheck();
          },
          error: () => {
            this.error.set('Failed to load the voucher.');
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Failed to load the voucher.');
        this.loading.set(false);
      },
    });
  }

  private loadLedgers() {
    this.ledgerService.searchList({ withoutCashAtBankAndCashInHand: false }).subscribe({
      next: result => this.ledgers.set(result.items),
      error: () => {},
    });
  }

  private loadCostCenters() {
    this.costCenterService.search({ activeOnly: true }).subscribe({
      next: items => this.costCenters.set(items),
      error: () => {},
    });
  }

  typeLabel(code: string): string {
    return this.types.find(t => t.code === code)?.label ?? code;
  }

  ledgerName(id: number | null | undefined): string {
    if (id == null) return '';
    return this.ledgerNameById().get(id) ?? `#${id}`;
  }

  /** Resolve a detail line's ledger name, preferring the API-supplied label. */
  detailLedgerName(detail: { ledgerId: number; ledgerName?: string | null }): string {
    return detail.ledgerName ?? this.ledgerName(detail.ledgerId);
  }

  /** Resolve a cost-center id to its name for display. */
  costCenterName(value: string | null | undefined): string {
    if (value == null || value === '') return '';
    const match = this.costCenters().find(c => String(c.id) === String(value));
    return match?.name ?? String(value);
  }

  /** Print the voucher (A5). The print stylesheet leaves only the sheet visible. */
  print() {
    if (this.canPrint()) window.print();
  }

  /** Return to the previous page (the voucher list / report). */
  back() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/voucher']);
    }
  }

  /** Download the voucher as an .xlsx mirroring the printed layout. */
  exportExcel() {
    const v = this.voucher();
    if (!v || !this.canPrint()) return;

    const rows: ExcelCell[][] = [
      [this.companyName],
      [`${this.typeLabel(v.type)} (${v.type})`],
      [],
      ['Voucher No', v.voucherNo || `#${v.id}`, '', 'Date', this.fmtDate(v.voucherDate)],
      ['Reference', v.reference || 'N/A', '', 'Cost Center', this.costCenterName(v.costCenter) || ''],
      [],
      ['Ledger', 'Dr. Amount', 'Cr. Amount'],
    ];
    for (const d of v.details ?? []) {
      rows.push([this.detailLedgerName(d), Number(d.debit) || 0, Number(d.credit) || 0]);
    }
    rows.push(['Total :', this.totalDebit(), this.totalCredit()]);
    rows.push([]);
    rows.push([`In Word : ${this.amountInWords()}`]);
    rows.push([`Narration : ${v.narration || ''}`]);

    const name = v.voucherNo || `voucher-${v.id}`;
    this.excel.download(name, rows, 'Voucher');
  }

  /** Format a date as dd/MM/yyyy; unparseable values are returned unchanged. */
  fmtDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }

  /** Spell out a money amount, e.g. 2000 → "Two Thousand Only". */
  private numberToWords(value: number): string {
    const amount = Math.round((Number(value) || 0) * 100) / 100;
    const whole = Math.floor(amount);
    const paisa = Math.round((amount - whole) * 100);

    const words = whole === 0 ? 'Zero' : this.wholeToWords(whole);
    const paisaPart = paisa > 0 ? ` And ${this.wholeToWords(paisa)} Paisa` : '';
    return `${words}${paisaPart} Only`;
  }

  private wholeToWords(num: number): string {
    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen',
    ];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const underThousand = (n: number): string => {
      let out = '';
      if (n >= 100) {
        out += ones[Math.floor(n / 100)] + ' Hundred';
        n %= 100;
        if (n) out += ' ';
      }
      if (n >= 20) {
        out += tens[Math.floor(n / 10)];
        if (n % 10) out += ' ' + ones[n % 10];
      } else if (n > 0) {
        out += ones[n];
      }
      return out;
    };

    const scales = ['', ' Thousand', ' Million', ' Billion', ' Trillion'];
    let n = num;
    const groups: number[] = [];
    while (n > 0) {
      groups.push(n % 1000);
      n = Math.floor(n / 1000);
    }
    const parts: string[] = [];
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i] === 0) continue;
      parts.push(underThousand(groups[i]) + scales[i]);
    }
    return parts.join(' ').trim();
  }
}
