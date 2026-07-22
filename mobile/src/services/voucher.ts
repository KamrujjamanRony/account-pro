import { api } from '../api/client';
import { ApiResponse, PagedResult } from '../models/api-response';
import { LedgerOption, Voucher, VoucherSearchQuery, VoucherSearchResult } from '../models/voucher';

const base = '/Voucher';

type Row = Record<string, unknown>;

export const voucherService = {
  /**
   * Cash & bank ledgers from the ledger endpoint. `section` selects the subset:
   * "" → all cash & bank, "cash" → cash in hand, "bank" → cash at bank.
   */
  async cashBankBalances(section = ''): Promise<LedgerOption[]> {
    const res = await api.post<ApiResponse<Row[] | { items?: Row[] }>>('/Ledger/CashBankBalance', {
      section,
    });
    const data = res.data;
    const rows = Array.isArray(data) ? data : data?.items ?? [];
    return rows
      .map((r) => ({
        id: Number(r['ledgerId'] ?? r['id'] ?? r['ledgerID'] ?? 0),
        ledgerName: String(r['ledgerName'] ?? r['name'] ?? r['ledger'] ?? ''),
      }))
      .filter((o) => o.id > 0);
  },

  async search(query: VoucherSearchQuery = {}): Promise<VoucherSearchResult> {
    type SearchData = Voucher[] | (PagedResult<Voucher> & { count?: number });
    const res = await api.post<ApiResponse<SearchData>>(`${base}/Search`, query);
    const data = res.data;
    const items = Array.isArray(data) ? data : data?.items ?? [];
    const count = Array.isArray(data) ? items.length : data?.count ?? data?.totalCount ?? items.length;
    return { items, count };
  },

  async getById(id: number): Promise<Voucher> {
    const res = await api.get<ApiResponse<Voucher>>(`${base}/${id}`);
    return res.data;
  },
  async add(voucher: Voucher): Promise<Voucher> {
    const res = await api.post<ApiResponse<Voucher>>(base, voucher);
    return res.data;
  },
  async update(id: number, voucher: Voucher): Promise<Voucher> {
    const res = await api.put<ApiResponse<Voucher>>(`${base}/${id}`, voucher);
    return res.data;
  },
  delete: (id: number) => api.delete<unknown>(`${base}/${id}`),
};
