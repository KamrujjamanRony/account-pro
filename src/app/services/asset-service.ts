import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Asset,
  AssetSearchQuery,
  DisposeAssetRequest,
  RunDepreciationRequest,
} from '../models/asset.model';
import { ApiResponse, PagedResult } from '../models/api-response.model';

@Service()
export class AssetService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/Asset`;

  search(query: AssetSearchQuery = {}): Observable<Asset[]> {
    return this.http
      .post<ApiResponse<Asset[] | PagedResult<Asset>>>(`${this.baseUrl}/Search`, query)
      .pipe(map(res => (Array.isArray(res.data) ? res.data : res.data?.items ?? [])));
  }

  getById(id: number): Observable<Asset> {
    return this.http
      .get<ApiResponse<Asset>>(`${this.baseUrl}/${id}`)
      .pipe(map(res => res.data));
  }

  add(asset: Asset): Observable<Asset> {
    return this.http
      .post<ApiResponse<Asset>>(this.baseUrl, asset)
      .pipe(map(res => res.data));
  }

  update(id: number, asset: Asset): Observable<Asset> {
    return this.http
      .put<ApiResponse<Asset>>(`${this.baseUrl}/${id}`, asset)
      .pipe(map(res => res.data));
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  /** Post depreciation for one asset (or all when `assetId` is null). */
  runDepreciation(request: RunDepreciationRequest): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/RunDepreciation`, request)
      .pipe(map(res => res.data));
  }

  /** Dispose of an asset, posting the gain/loss and removing it from the register. */
  dispose(id: number, request: DisposeAssetRequest): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/${id}/Dispose`, request)
      .pipe(map(res => res.data));
  }
}
