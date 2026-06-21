import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LedgerOption, Voucher, VoucherSearchQuery, VoucherSearchResult } from '../models/voucher.model';
import { ApiResponse, PagedResult } from '../models/api-response.model';

@Service()
export class VoucherService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/Voucher`;

  /**
   * Cash & bank ledgers from the ledger endpoint. `section` selects the subset:
   * "" → all cash & bank, "cash" → cash in hand, "bank" → cash at bank.
   */
  cashBankBalances(section = ''): Observable<LedgerOption[]> {
    type Row = Record<string, unknown>;
    return this.http
      .post<ApiResponse<Row[] | { items?: Row[] }>>(`${environment.apiUrl}/Ledger/CashBankBalance`, {
        section,
      })
      .pipe(
        map(res => {
          const data = res.data;
          const rows = Array.isArray(data) ? data : data?.items ?? [];
          return rows
            .map(r => ({
              id: Number(r['ledgerId'] ?? r['id'] ?? r['ledgerID'] ?? 0),
              ledgerName: String(r['ledgerName'] ?? r['name'] ?? r['ledger'] ?? ''),
            }))
            .filter(o => o.id > 0);
        }),
      );
  }

  search(query: VoucherSearchQuery = {}): Observable<VoucherSearchResult> {
    type SearchData = Voucher[] | (PagedResult<Voucher> & { count?: number });
    return this.http
      .post<ApiResponse<SearchData>>(`${this.baseUrl}/Search`, query)
      .pipe(
        map(res => {
          const data = res.data;
          const items = Array.isArray(data) ? data : data?.items ?? [];
          const count = Array.isArray(data)
            ? items.length
            : data?.count ?? data?.totalCount ?? items.length;
          return { items, count };
        }),
      );
  }

  getById(id: number): Observable<Voucher> {
    return this.http
      .get<ApiResponse<Voucher>>(`${this.baseUrl}/${id}`)
      .pipe(map(res => res.data));
  }

  add(voucher: Voucher): Observable<Voucher> {
    return this.http
      .post<ApiResponse<Voucher>>(this.baseUrl, voucher)
      .pipe(map(res => res.data));
  }

  update(id: number, voucher: Voucher): Observable<Voucher> {
    return this.http
      .put<ApiResponse<Voucher>>(`${this.baseUrl}/${id}`, voucher)
      .pipe(map(res => res.data));
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
