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
