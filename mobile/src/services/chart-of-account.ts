import { api } from '../api/client';
import { ApiResponse } from '../models/api-response';
import { ChartOfAccount, ChartSearchQuery, ChartTreeNode } from '../models/chart-of-account';

const base = '/ChartOfAccount';

export const chartOfAccountService = {
  async search(query: ChartSearchQuery = {}): Promise<ChartOfAccount[]> {
    const res = await api.post<ApiResponse<ChartOfAccount[]>>(`${base}/Search`, query);
    return res.data ?? [];
  },
  async getTree(): Promise<ChartTreeNode[]> {
    const res = await api.get<ApiResponse<ChartTreeNode[]>>(`${base}/Tree`);
    return res.data ?? [];
  },
  async add(account: ChartOfAccount): Promise<ChartOfAccount> {
    const res = await api.post<ApiResponse<ChartOfAccount>>(base, account);
    return res.data;
  },
  async update(id: number, account: ChartOfAccount): Promise<ChartOfAccount> {
    const res = await api.put<ApiResponse<ChartOfAccount>>(`${base}/${id}`, account);
    return res.data;
  },
  delete: (id: number) => api.delete<unknown>(`${base}/${id}`),
  seed: () => api.post<unknown>(`${base}/Seed`, {}),
};
