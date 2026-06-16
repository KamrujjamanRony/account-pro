/** A single debit/credit line within a voucher. */
export interface VoucherDetail {
  id?: number;
  ledgerId: number;
  debit: number;
  credit: number;
  remarks?: string | null;
  /** Ledger name, when the API echoes it back on read. */
  ledgerName?: string | null;
}

/** A double-entry voucher with its detail lines. */
export interface Voucher {
  id?: number;
  /** Voucher type code, e.g. "JV", "CR", "CP". */
  type: string;
  voucherDate: string;
  reference?: string | null;
  costCenter?: string | null;
  narration?: string | null;
  postBy?: string;
  updateBy?: string;
  details: VoucherDetail[];
  /** Summary fields the list endpoint may echo back. */
  voucherNo?: string | null;
  amount?: number;
  totalDebit?: number;
  totalCredit?: number;
}

export interface VoucherSearchQuery {
  id?: number | null;
  type?: string | null;
  ledgerId?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
  search?: string | null;
}

export interface VoucherSearchResult {
  items: Voucher[];
  count: number;
}

/** Supported voucher types, shown in the type selector. */
export interface VoucherTypeOption {
  code: string;
  label: string;
}

export const VOUCHER_TYPES: readonly VoucherTypeOption[] = [
  { code: 'JV', label: 'Journal Voucher' },
  { code: 'CR', label: 'Cash Receipt' },
  { code: 'CP', label: 'Cash Payment' },
  { code: 'BR', label: 'Bank Receipt' },
  { code: 'BP', label: 'Bank Payment' },
  { code: 'CV', label: 'Contra Voucher' },
];
