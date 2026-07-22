import { api } from '../api/client';
import { ApiResponse, PagedResult } from '../models/api-response';
import { CostCenter, CostCenterSearchQuery } from '../models/cost-center';

const base = '/CostCenter';

export const costCenterService = {
  async search(query: CostCenterSearchQuery = {}): Promise<CostCenter[]> {
    const res = await api.post<ApiResponse<CostCenter[] | PagedResult<CostCenter>>>(`${base}/Search`, query);
    return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
  },
  async getById(id: number): Promise<CostCenter> {
    const res = await api.get<ApiResponse<CostCenter>>(`${base}/${id}`);
    return res.data;
  },
  async add(costCenter: CostCenter): Promise<CostCenter> {
    const res = await api.post<ApiResponse<CostCenter>>(base, costCenter);
    return res.data;
  },
  async update(id: number, costCenter: CostCenter): Promise<CostCenter> {
    const res = await api.put<ApiResponse<CostCenter>>(`${base}/${id}`, costCenter);
    return res.data;
  },
  delete: (id: number) => api.delete<unknown>(`${base}/${id}`),
};
