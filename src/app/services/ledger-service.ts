import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Ledger, LedgerSearchQuery, LedgerSearchResult } from '../models/ledger.model';
import { ApiResponse, PagedResult } from '../models/api-response.model';

@Service()
export class LedgerService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/Ledger`;

  search(query: LedgerSearchQuery = {}): Observable<LedgerSearchResult> {
    return this.http
      .post<ApiResponse<PagedResult<Ledger> & Partial<LedgerSearchResult>>>(`${this.baseUrl}/Search`, query)
      .pipe(
        map(res => ({
          items: res.data?.items ?? [],
          count: res.data?.count ?? res.data?.items?.length ?? 0,
          totalDrOpeningBalance: res.data?.totalDrOpeningBalance ?? 0,
          totalCrOpeningBalance: res.data?.totalCrOpeningBalance ?? 0,
        })),
      );
  }

  /** Ledgers filtered by opening-balance presence; drives the ledger page tabs. */
  searchOpening(query: LedgerSearchQuery = {}): Observable<LedgerSearchResult> {
    return this.http
      .post<ApiResponse<PagedResult<Ledger> & Partial<LedgerSearchResult>>>(`${this.baseUrl}/SearchOpening`, query)
      .pipe(
        map(res => ({
          items: res.data?.items ?? [],
          count: res.data?.count ?? res.data?.items?.length ?? 0,
          totalDrOpeningBalance: res.data?.totalDrOpeningBalance ?? 0,
          totalCrOpeningBalance: res.data?.totalCrOpeningBalance ?? 0,
        })),
      );
  }

  /** Flat ledger list for pickers; supports the cash/bank exclusion flag. */
  searchList(query: LedgerSearchQuery = {}): Observable<LedgerSearchResult> {
    type Data = Ledger[] | (PagedResult<Ledger> & Partial<LedgerSearchResult>);
    return this.http
      .post<ApiResponse<Data>>(`${this.baseUrl}/SearchList`, query)
      .pipe(
        map(res => {
          const data = res.data;
          const items = Array.isArray(data) ? data : data?.items ?? [];
          return {
            items,
            count: Array.isArray(data) ? items.length : data?.count ?? items.length,
            totalDrOpeningBalance: Array.isArray(data) ? 0 : data?.totalDrOpeningBalance ?? 0,
            totalCrOpeningBalance: Array.isArray(data) ? 0 : data?.totalCrOpeningBalance ?? 0,
          };
        }),
      );
  }

  add(ledger: Ledger): Observable<Ledger> {
    return this.http
      .post<ApiResponse<Ledger>>(this.baseUrl, ledger)
      .pipe(map(res => res.data));
  }

  update(id: number, ledger: Ledger): Observable<Ledger> {
    return this.http
      .put<ApiResponse<Ledger>>(`${this.baseUrl}/${id}`, ledger)
      .pipe(map(res => res.data));
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
