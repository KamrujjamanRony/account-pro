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
  { code: 'CR', label: 'Cash Receipt' },
  { code: 'CP', label: 'Cash Payment' },
  { code: 'BR', label: 'Bank Receipt' },
  { code: 'BP', label: 'Bank Payment' },
  { code: 'CV', label: 'Contra Voucher' },
  { code: 'JV', label: 'Journal Voucher' },
];

/** Minimal ledger shape used by the line ledger pickers. */
export interface LedgerOption {
  id: number;
  ledgerName: string;
}

/** How the entry grid behaves for a given voucher type. */
export interface VoucherTypeBehavior {
  /** Row 1 is auto-filled from CashBankBalance and its ledger field is locked. */
  lockFirst: boolean;
  /** `section` passed to CashBankBalance to source the locked first ledger. */
  firstSection?: string;
  /** Every line's ledger picker is limited to cash & bank ledgers (Contra). */
  cashBankAll: boolean;
  /**
   * Side that the locked first (cash/bank) ledger sits on:
   * - 'debit'  → receipt: row 1 debit = Σ(other credits); all debit fields locked.
   * - 'credit' → payment: row 1 credit = Σ(other debits); all credit fields locked.
   * Undefined → free entry with per-row one-sided locking (JV, Contra).
   */
  firstSide?: 'debit' | 'credit';
}

export const DEFAULT_VOUCHER_BEHAVIOR: VoucherTypeBehavior = {
  lockFirst: false,
  cashBankAll: false,
};

export const VOUCHER_TYPE_BEHAVIOR: Record<string, VoucherTypeBehavior> = {
  CR: { lockFirst: true, firstSection: 'Cash-in-Hand', cashBankAll: false, firstSide: 'debit' },
  CP: { lockFirst: true, firstSection: 'Cash-in-Hand', cashBankAll: false, firstSide: 'credit' },
  BR: { lockFirst: true, firstSection: 'Cash-at-Bank', cashBankAll: false, firstSide: 'debit' },
  BP: { lockFirst: true, firstSection: 'Cash-at-Bank', cashBankAll: false, firstSide: 'credit' },
  CV: { lockFirst: false, cashBankAll: true },
  JV: { lockFirst: false, cashBankAll: false },
};
