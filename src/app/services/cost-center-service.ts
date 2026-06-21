import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CostCenter, CostCenterSearchQuery } from '../models/cost-center.model';
import { ApiResponse, PagedResult } from '../models/api-response.model';

@Service()
export class CostCenterService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/CostCenter`;

//   {
//   "id": null,
//   "search": null,
//   "activeOnly": false
// }

  search(query: CostCenterSearchQuery = {}): Observable<CostCenter[]> {
    return this.http
      .post<ApiResponse<CostCenter[] | PagedResult<CostCenter>>>(`${this.baseUrl}/Search`, query)
      .pipe(map(res => (Array.isArray(res.data) ? res.data : res.data?.items ?? [])));
  }

  getById(id: number): Observable<CostCenter> {
    return this.http
      .get<ApiResponse<CostCenter>>(`${this.baseUrl}/${id}`)
      .pipe(map(res => res.data));
  }

  add(costCenter: CostCenter): Observable<CostCenter> {
    return this.http
      .post<ApiResponse<CostCenter>>(this.baseUrl, costCenter)
      .pipe(map(res => res.data));
  }

  update(id: number, costCenter: CostCenter): Observable<CostCenter> {
    return this.http
      .put<ApiResponse<CostCenter>>(`${this.baseUrl}/${id}`, costCenter)
      .pipe(map(res => res.data));
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
