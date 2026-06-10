import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Ledger, LedgerSearchQuery } from '../models/ledger.model';
import { ApiResponse, PagedResult } from '../models/api-response.model';

@Service()
export class LedgerService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/Ledger`;

  search(query: LedgerSearchQuery = {}): Observable<Ledger[]> {
    return this.http
      .post<ApiResponse<PagedResult<Ledger>>>(`${this.baseUrl}/Search`, query)
      .pipe(map(res => res.data?.items ?? []));
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
