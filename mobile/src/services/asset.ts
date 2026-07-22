import { api } from '../api/client';
import { ApiResponse, PagedResult } from '../models/api-response';
import { Asset, AssetSearchQuery, DisposeAssetRequest, RunDepreciationRequest } from '../models/asset';

const base = '/Asset';

export const assetService = {
  async search(query: AssetSearchQuery = {}): Promise<Asset[]> {
    const res = await api.post<ApiResponse<Asset[] | PagedResult<Asset>>>(`${base}/Search`, query);
    return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
  },
  async getById(id: number): Promise<Asset> {
    const res = await api.get<ApiResponse<Asset>>(`${base}/${id}`);
    return res.data;
  },
  async add(asset: Asset): Promise<Asset> {
    const res = await api.post<ApiResponse<Asset>>(base, asset);
    return res.data;
  },
  async update(id: number, asset: Asset): Promise<Asset> {
    const res = await api.put<ApiResponse<Asset>>(`${base}/${id}`, asset);
    return res.data;
  },
  delete: (id: number) => api.delete<unknown>(`${base}/${id}`),
  runDepreciation: (request: RunDepreciationRequest) =>
    api.post<ApiResponse<unknown>>(`${base}/RunDepreciation`, request),
  dispose: (id: number, request: DisposeAssetRequest) =>
    api.post<ApiResponse<unknown>>(`${base}/${id}/Dispose`, request),
};
