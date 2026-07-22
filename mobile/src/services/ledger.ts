import { api } from '../api/client';
import { ApiResponse, PagedResult } from '../models/api-response';
import { Ledger, LedgerSearchQuery, LedgerSearchResult } from '../models/ledger';

const base = '/Ledger';

type LedgerData = PagedResult<Ledger> & Partial<LedgerSearchResult>;

function toResult(data: LedgerData | Ledger[] | undefined): LedgerSearchResult {
  if (Array.isArray(data)) {
    return { items: data, count: data.length, totalDrOpeningBalance: 0, totalCrOpeningBalance: 0 };
  }
  return {
    items: data?.items ?? [],
    count: data?.count ?? data?.items?.length ?? 0,
    totalDrOpeningBalance: data?.totalDrOpeningBalance ?? 0,
    totalCrOpeningBalance: data?.totalCrOpeningBalance ?? 0,
  };
}

export const ledgerService = {
  async search(query: LedgerSearchQuery = {}): Promise<LedgerSearchResult> {
    const res = await api.post<ApiResponse<LedgerData>>(`${base}/Search`, query);
    return toResult(res.data);
  },
  async searchOpening(query: LedgerSearchQuery = {}): Promise<LedgerSearchResult> {
    const res = await api.post<ApiResponse<LedgerData>>(`${base}/SearchOpening`, query);
    return toResult(res.data);
  },
  async searchList(query: LedgerSearchQuery = {}): Promise<LedgerSearchResult> {
    const res = await api.post<ApiResponse<LedgerData | Ledger[]>>(`${base}/SearchList`, query);
    return toResult(res.data);
  },
  async add(ledger: Ledger): Promise<Ledger> {
    const res = await api.post<ApiResponse<Ledger>>(base, ledger);
    return res.data;
  },
  async update(id: number, ledger: Ledger): Promise<Ledger> {
    const res = await api.put<ApiResponse<Ledger>>(`${base}/${id}`, ledger);
    return res.data;
  },
  delete: (id: number) => api.delete<unknown>(`${base}/${id}`),
};
