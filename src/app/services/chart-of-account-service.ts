import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ChartOfAccount, ChartSearchQuery, ChartTreeNode } from '../models/chart-of-account.model';
import { ApiResponse } from '../models/api-response.model';

@Service()
export class ChartOfAccountService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/ChartOfAccount`;

  search(query: ChartSearchQuery = {}): Observable<ChartOfAccount[]> {
    return this.http
      .post<ApiResponse<ChartOfAccount[]>>(`${this.baseUrl}/Search`, query)
      .pipe(map(res => res.data));
  }

  getTree(): Observable<ChartTreeNode[]> {
    return this.http
      .get<ApiResponse<ChartTreeNode[]>>(`${this.baseUrl}/Tree`)
      .pipe(map(res => res.data));
  }

  add(account: ChartOfAccount): Observable<ChartOfAccount> {
    return this.http
      .post<ApiResponse<ChartOfAccount>>(this.baseUrl, account)
      .pipe(map(res => res.data));
  }

  update(id: number, account: ChartOfAccount): Observable<ChartOfAccount> {
    return this.http
      .put<ApiResponse<ChartOfAccount>>(`${this.baseUrl}/${id}`, account)
      .pipe(map(res => res.data));
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  /** Seed the default chart of accounts. */
  seed(): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/Seed`, {});
  }
}
