/** A ledger record under a chart-of-account group. */
export interface Ledger {
  id?: number;
  groupId: number;
  /** Chart-of-account code, e.g. "1-01-03-01.0001". */
  code?: string | null;
  ledgerName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  drOpeningBalance: number;
  crOpeningBalance: number;
  note?: string | null;
  isActive: boolean;
  postBy?: string;
  updateBy?: string;
  /** Group name, when the API echoes it back on read. */
  groupName?: string | null;
}

export interface LedgerSearchQuery {
  id?: number | null;
  groupId?: number | null;
  search?: string | null;
  withOpeningOnly?: boolean;
}

/** Search payload for ledgers, including opening-balance totals. */
export interface LedgerSearchResult {
  items: Ledger[];
  count: number;
  totalDrOpeningBalance: number;
  totalCrOpeningBalance: number;
}
