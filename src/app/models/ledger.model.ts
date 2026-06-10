/** A ledger record under a chart-of-account group. */
export interface Ledger {
  id?: number;
  groupId: number;
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
