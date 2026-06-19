import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { BookKind, CashBookLine, CashBookReport, ReportDateQuery } from '../models/report.model';

type Row = Record<string, unknown>;

@Service()
export class ReportService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/Report`;

  /** Cash Book — receipts & payments through the cash ledgers for a date range. */
  cashBook(query: ReportDateQuery): Observable<CashBookReport> {
    return this.fetch('CashBook', query, 'cash');
  }

  /** Bank Book — receipts & payments through the bank ledgers for a date range. */
  bankBook(query: ReportDateQuery): Observable<CashBookReport> {
    return this.fetch('BankBook', query, 'bank');
  }

  private fetch(endpoint: string, query: ReportDateQuery, kind: BookKind): Observable<CashBookReport> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/${endpoint}`, query)
      .pipe(map(res => this.normalize(res?.data, query, kind)));
  }

  /**
   * Reshape the (loosely-typed) API payload into a {@link CashBookReport}. The
   * report endpoints aren't strongly specified, so we read each field from a
   * set of likely aliases and fall back to computing totals client-side. The
   * payload may be either a flat array of rows or an object that already groups
   * opening / transactions / closing.
   */
  private normalize(data: unknown, query: ReportDateQuery, kind: BookKind): CashBookReport {
    const root = (data ?? {}) as Row;

    const companyName = String(
      this.pick(root, ['companyName', 'company', 'companyTitle']) ?? environment.companyName,
    );
    const fromDate = String(this.pick(root, ['fromDate', 'dateFrom', 'startDate']) ?? query.fromDate);
    const toDate = String(this.pick(root, ['toDate', 'dateTo', 'endDate']) ?? query.toDate);

    // Locate the transaction rows wherever the API parked them.
    const rawRows = Array.isArray(data)
      ? (data as Row[])
      : (this.pick(root, ['transactions', 'items', 'details', 'rows', 'lines', 'data']) as Row[]) ?? [];

    // Some payloads tag opening/closing inside the same rows array; split those
    // out so they render in their own sections rather than as transactions.
    const opening = this.toLine(
      (this.pick(root, ['opening', 'openingBalance', 'openingCash', 'openingBank']) as Row) ??
        rawRows.find(r => this.isSection(r, 'open')) ??
        null,
      kind === 'cash' ? 'Cash' : 'Bank',
    );
    const closing = this.toLine(
      (this.pick(root, ['closing', 'closingBalance', 'closingCash', 'closingBank']) as Row) ??
        rawRows.find(r => this.isSection(r, 'clos')) ??
        null,
      kind === 'cash' ? 'Cash' : 'Bank',
    );

    const transactions = rawRows
      .filter(r => !this.isSection(r, 'open') && !this.isSection(r, 'clos'))
      .map(r => this.toLine(r, ''))
      .filter((l): l is CashBookLine => l !== null);

    const subTotalReceipt = this.sum(root, ['subTotalReceipt', 'subTotalReceipt'], transactions, 'receipt');
    const subTotalPayment = this.sum(root, ['subTotalPayment'], transactions, 'payment');

    const grandTotalReceipt =
      this.num(this.pick(root, ['grandTotalReceipt', 'totalReceipt'])) ??
      (opening?.receipt ?? 0) + subTotalReceipt;
    const grandTotalPayment =
      this.num(this.pick(root, ['grandTotalPayment', 'totalPayment'])) ??
      subTotalPayment + (closing?.payment ?? 0);

    return {
      companyName,
      fromDate,
      toDate,
      opening,
      transactions,
      closing,
      subTotalReceipt,
      subTotalPayment,
      grandTotalReceipt,
      grandTotalPayment,
    };
  }

  private toLine(row: Row | null, defaultLedger: string): CashBookLine | null {
    if (!row) return null;
    return {
      date: String(this.pick(row, ['date', 'voucherDate', 'vDate', 'transactionDate']) ?? ''),
      voucherId: String(this.pick(row, ['voucherNo', 'voucherId', 'id', 'vNo', 'code']) ?? ''),
      reference: String(this.pick(row, ['reference', 'ref', 'refNo']) ?? ''),
      ledger: String(this.pick(row, ['ledger', 'ledgerName', 'name', 'account']) ?? defaultLedger),
      narration: String(this.pick(row, ['narration', 'remarks', 'description', 'particulars']) ?? ''),
      receipt: this.num(this.pick(row, ['receipt', 'receiptAmount', 'debit', 'dr', 'inflow'])) ?? 0,
      payment: this.num(this.pick(row, ['payment', 'paymentAmount', 'credit', 'cr', 'outflow'])) ?? 0,
    };
  }

  /** First defined value among the given keys (case-insensitive). */
  private pick(row: Row, keys: string[]): unknown {
    for (const key of keys) {
      if (row[key] != null) return row[key];
      const found = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
      if (found && row[found] != null) return row[found];
    }
    return undefined;
  }

  /** Whether a row is tagged as the opening/closing section (by a marker field). */
  private isSection(row: Row, marker: string): boolean {
    const tag = String(this.pick(row, ['section', 'type', 'group', 'rowType']) ?? '').toLowerCase();
    return tag.includes(marker);
  }

  private sum(root: Row, keys: string[], lines: CashBookLine[], field: 'receipt' | 'payment'): number {
    const given = this.num(this.pick(root, keys));
    if (given != null) return given;
    return lines.reduce((acc, l) => acc + l[field], 0);
  }

  private num(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
}
