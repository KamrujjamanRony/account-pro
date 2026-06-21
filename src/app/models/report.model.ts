/** A single Receipt & Payment row in a Cash Book / Bank Book report. */
export interface CashBookLine {
  /** Posting date (ISO or whatever the API returns). */
  date: string;
  /** Voucher identifier shown in the ID column, e.g. "A-626". */
  voucherId: string;
  /** Reference column, e.g. "N/A". */
  reference: string;
  /** Ledger name, e.g. "Akash-1". */
  ledger: string;
  /** Narration / remarks. */
  narration: string;
  /** Money received (Receipt column). */
  receipt: number;
  /** Money paid out (Payment column). */
  payment: number;
}

/**
 * Normalised Cash Book / Bank Book report, modelled on the printed layout:
 * A. Opening → B. Receipt & Payment (+ Sub Total) → C. Closing → Grand Total.
 */
export interface CashBookReport {
  companyName: string;
  fromDate: string;
  toDate: string;
  /** A. Opening balance rows (Receipt = opening cash/bank in hand). */
  opening: CashBookLine[];
  /** B. Receipt & Payment transaction lines. */
  transactions: CashBookLine[];
  /** C. Closing balance rows (Payment = closing cash/bank carried forward). */
  closing: CashBookLine[];
  /** Sum of the transaction receipts (Sub Total). */
  subTotalReceipt: number;
  /** Sum of the transaction payments (Sub Total). */
  subTotalPayment: number;
  /** Opening + receipts (Grand Total receipt column). */
  grandTotalReceipt: number;
  /** Payments + closing (Grand Total payment column). */
  grandTotalPayment: number;
}

/** Date range passed to the report endpoints. */
export interface ReportDateQuery {
  fromDate: string;
  toDate: string;
}

/** Which book a report page renders. Drives endpoint + labels. */
export type BookKind = 'cash' | 'bank';

/** A single ledger row within a Receipt & Payment Statement group. */
export interface RpsLine {
  /** Ledger name/code, e.g. "L-0001" or "Akash-1". */
  ledger: string;
  /** Money received (Receipt column). */
  receipt: number;
  /** Money paid out (Payment column). */
  payment: number;
}

/** A ledger group (e.g. "Cash-at-Bank") within a statement section. */
export interface RpsGroup {
  groupName: string;
  lines: RpsLine[];
  subTotalReceipt: number;
  subTotalPayment: number;
}

/** One of the three statement sections (A. Opening / B. Receipt & Payment / C. Closing). */
export interface RpsSection {
  sectionTitle: string;
  groups: RpsGroup[];
  summaryReceipt: number;
  summaryPayment: number;
}

/**
 * Receipt & Payment Statement, modelled on the printed layout:
 * A. Opening Cash & Bank → B. Receipt & Payment → C. Closing Cash & Bank → Grand Total.
 */
export interface ReceiptPaymentStatement {
  /** Company name for the letterhead (falls back to the configured company). */
  companyName: string;
  title: string;
  /** Selected option label, e.g. "Only Cash & Bank Ledger". */
  option: string;
  fromDate: string;
  toDate: string;
  /** A. Opening Cash & Bank. */
  openingCashBank: RpsSection;
  /** B. Receipt & Payment. */
  receiptPayment: RpsSection;
  /** C. Closing Cash & Bank. */
  closingCashBank: RpsSection;
  grandTotalReceipt: number;
  grandTotalPayment: number;
}

/** Filter query for the Receipt & Payment Statement endpoint. */
export interface ReceiptPaymentQuery extends ReportDateQuery {
  /** Optional group filter; null = all groups. */
  groupName?: string | null;
  /** Optional ledger filter; null = all ledgers. */
  ledger?: string | null;
}

/** A debit/credit pair shown under one of the Trial Balance balance columns. */
export interface DebitCredit {
  debit: number;
  credit: number;
}

/** Opening / Current / Closing debit-credit totals for a line, group or section. */
export interface TrialBalanceTotals {
  /** Opening Balance column (Dr/Cr). */
  opening: DebitCredit;
  /** Current Balance column (Dr/Cr) — movement within the period. */
  period: DebitCredit;
  /** Closing Balance column (Dr/Cr). */
  closing: DebitCredit;
}

/** A single ledger row in a Trial Balance report. */
export interface TrialBalanceLine extends TrialBalanceTotals {
  /** Ledger code, e.g. "L-0001". */
  ledgerCode: string;
  /** Ledger name, e.g. "Cash In Hand". */
  ledgerName: string;
  /** Owning group name, e.g. "Cash-in-Hand". */
  groupName: string;
}

/** Ledgers sharing a group (e.g. "Account Payables") within a nature section. */
export interface TrialBalanceGroup {
  groupName: string;
  lines: TrialBalanceLine[];
  /** Sum of the group's lines (the "Sub Total :" row). */
  subTotal: TrialBalanceTotals;
}

/** A nature section (Asset / Liability / Income / Expense). */
export interface TrialBalanceSection {
  /** Nature label, e.g. "Asset". */
  nature: string;
  groups: TrialBalanceGroup[];
  /** Section total (the "Summary for … :" row). */
  total: TrialBalanceTotals;
}

/**
 * Normalised Trial Balance report, modelled on the printed layout:
 * sections grouped by nature → ledger groups (+ Sub Total) → Grand Total,
 * each with Opening / Current / Closing debit-credit columns.
 */
export interface TrialBalanceReport {
  companyName: string;
  title: string;
  fromDate: string;
  toDate: string;
  sections: TrialBalanceSection[];
  grandTotal: TrialBalanceTotals;
}

/** Filter query for the Trial Balance endpoint. */
export interface TrialBalanceQuery extends ReportDateQuery {
  /** Optional ledger filter; null = all ledgers. */
  ledger?: string | null;
  /** Optional group filter; null = all groups. */
  groupName?: string | null;
}

/** Which side a running balance sits on. Empty when there is no balance. */
export type BalanceSide = 'Dr' | 'Cr' | '';

/** A single transaction (or opening) row within a General Ledger account. */
export interface GeneralLedgerLine {
  /** Posting date; empty for the Opening row. */
  date: string;
  /** Voucher number shown in the "Vch. No." column, e.g. "A-628". Empty for Opening. */
  voucherNo: string;
  /** Narration / particulars. "Opening" for the opening row. */
  narration: string;
  /** Short narration column. */
  shortNarration: string;
  /** Dr. Amount column. */
  debit: number;
  /** Cr. Amount column. */
  credit: number;
  /** Running balance magnitude. */
  balance: number;
  /** Side of the running balance (Dr/Cr suffix in the Balance column). */
  balanceSide: BalanceSide;
  /** Whether this is the opening-balance row (rendered without date/voucher). */
  isOpening: boolean;
}

/** A ledger account within a group, e.g. "Conveyance". */
export interface GeneralLedgerAccount {
  ledgerName: string;
  lines: GeneralLedgerLine[];
  /** Sum of the account's movement debits (the "Sub Total :" row). */
  subTotalDebit: number;
  /** Sum of the account's movement credits (the "Sub Total :" row). */
  subTotalCredit: number;
  /** Whether to render the Sub Total row (account has more than one movement line). */
  hasSubTotal: boolean;
}

/** A ledger group, e.g. "Administration Overheads". */
export interface GeneralLedgerGroup {
  groupName: string;
  accounts: GeneralLedgerAccount[];
  /** Total debit for the group (the "Summary for … :" row). */
  summaryDebit: number;
  /** Total credit for the group (the "Summary for … :" row). */
  summaryCredit: number;
  /** Group closing balance magnitude shown on the summary row. */
  closingBalance: number;
  /** Side of the group closing balance. */
  closingSide: BalanceSide;
}

/**
 * Normalised General Ledger report, modelled on the printed layout:
 * group → ledger account → (Opening / transactions / Sub Total) → group Summary,
 * with Date / Vch. No. / Narration / Short Narration / Dr / Cr / Balance columns.
 */
export interface GeneralLedgerReport {
  companyName: string;
  title: string;
  fromDate: string;
  toDate: string;
  /** Cost-center filter label shown in the letterhead, e.g. "all". */
  costCenter: string;
  groups: GeneralLedgerGroup[];
}

/** Filter query for the General Ledger endpoint. */
export interface GeneralLedgerQuery extends ReportDateQuery {
  /** Optional group filter; null = all groups. */
  groupName?: string | null;
  /** Optional ledger filter; null = all ledgers. */
  ledger?: string | null;
  /** Optional cost-center filter; null = all cost centers. */
  costCenter?: string | null;
}

/** A single Group / Ledger / Short Narration / Dr / Cr detail row of a voucher. */
export interface DayBookDetail {
  /** Owning group name, e.g. "Cash-in-Hand". */
  groupName: string;
  /** Ledger name, e.g. "Cash". */
  ledgerName: string;
  /** Short narration column. */
  shortNarration: string;
  /** Dr. Amount column. */
  debit: number;
  /** Cr. Amount column. */
  credit: number;
}

/** A single voucher block within a Day Book section. */
export interface DayBookVoucher {
  /** Voucher identifier shown after "ID :", e.g. "A-625". */
  voucherId: string;
  /** Posting date (ISO or whatever the API returns). */
  date: string;
  /** Type label shown after "Type :", e.g. "CR - Cash Receive". */
  type: string;
  /** Reference shown after "Reference :", e.g. "123546" or "N/A". */
  reference: string;
  /** Cost center label shown after "Cost Center :"; empty when none. */
  costCenter: string;
  /** Full narration shown on the "Narration :" line below the voucher. */
  narration: string;
  /** The voucher's detail (Dr/Cr) rows. */
  details: DayBookDetail[];
  /** Sum of the voucher's debits (the "Sub Total :" row). */
  subTotalDebit: number;
  /** Sum of the voucher's credits (the "Sub Total :" row). */
  subTotalCredit: number;
}

/** A Day Book section (e.g. "Account") grouping vouchers with a running summary. */
export interface DayBookSection {
  /** Section heading shown above the vouchers, e.g. "Account". */
  sectionName: string;
  vouchers: DayBookVoucher[];
  /** Section total debit (the "Summary for … :" row). */
  summaryDebit: number;
  /** Section total credit (the "Summary for … :" row). */
  summaryCredit: number;
}

/**
 * Normalised Day Book report, modelled on the printed layout:
 * section → voucher (header / Group-Ledger detail rows / Sub Total / Narration)
 * → section Summary, with Group / Ledger / Short Narration / Dr / Cr columns.
 */
export interface DayBookReport {
  companyName: string;
  title: string;
  fromDate: string;
  toDate: string;
  sections: DayBookSection[];
}

/** Filter query for the Day Book endpoint. */
export interface DayBookQuery extends ReportDateQuery {
  /** Optional voucher-type filter (code, e.g. "JV"); null = all types. */
  type?: string | null;
  /** Optional group filter as chart-of-account ids; null/empty = all groups. */
  groupName?: number[] | null;
  /** Optional ledger filter as ledger ids; null/empty = all ledgers. */
  ledger?: number[] | null;
}

/** A child ledger row shown under a balance-sheet group in the detailed view. */
export interface BalanceSheetLedger {
  /** Ledger code, e.g. "L-0007"; empty for synthesized rows like the year's P&L. */
  ledgerCode: string;
  /** Ledger name, e.g. "Customer - ABC Traders". */
  name: string;
  /** Ledger closing amount. */
  amount: number;
}

/** A group within a balance-sheet section, e.g. "Account Receivables". */
export interface BalanceSheetGroup {
  /** Group name shown in the left column. */
  groupName: string;
  /** Group total (the group's `subtotal`) shown in the Amount column. */
  amount: number;
  /** Child ledger rows (rendered only in the detailed/sub-ledger view). */
  ledgers: BalanceSheetLedger[];
}

/**
 * A labelled block of groups within a side. Assets render as a single unnamed
 * section; Liabilities render as a main block plus an "Equity" block, mirroring
 * the printed layout where Equity sits under Liabilities.
 */
export interface BalanceSheetSection {
  /** Section heading, e.g. "Equity"; empty for the side's main block. */
  sectionName: string;
  groups: BalanceSheetGroup[];
  /** The "Sub Total :" amount for the section. */
  subTotal: number;
}

/** One side of the balance sheet: Assets or Liabilities (+ Equity). */
export interface BalanceSheetSide {
  /** Side heading, "Assets" or "Liabilities". */
  title: string;
  sections: BalanceSheetSection[];
  /** The "Summary for … :" amount for the whole side. */
  summary: number;
}

/**
 * Normalised Balance Sheet report, modelled on the printed layout:
 * Assets / Liabilities sides → sections → groups (+ optional ledger detail and
 * Sub Total) → side Summary, with an overall balanced check.
 */
export interface BalanceSheetReport {
  companyName: string;
  title: string;
  /** "As on" date for the snapshot. */
  asOfDate: string;
  /** Start of the fiscal year the snapshot belongs to. */
  fiscalYearStart: string;
  assets: BalanceSheetSide;
  /** Liabilities side, with Equity folded in as its own section. */
  liabilities: BalanceSheetSide;
  /** Assets − (Liabilities + Equity); 0 when the sheet balances. */
  difference: number;
  /** Whether totals on both sides agree. */
  isBalanced: boolean;
}

/** Detail level for the Balance Sheet view: group totals only, or with ledger lines. */
export type BalanceSheetLevel = 'group' | 'detail';

/** Filter query for the Balance Sheet endpoint. */
export interface BalanceSheetQuery {
  /** Snapshot date, ISO `yyyy-MM-dd`. */
  asOfDate: string;
  /** Start of the fiscal year, ISO `yyyy-MM-dd`. */
  fiscalYearStart: string;
}

/**
 * Visual role of a Profit & Loss row, driving indentation and emphasis:
 * `section` (heading, e.g. "Operating Revenue"), `group` (e.g. "Sales Account"),
 * `ledger` (e.g. "Sales"), `subtotal` ("Sub Total :"), `summary`
 * ("Summary for Gross Profit :") and `net` ("Net Profit\Loss :").
 */
export type ProfitLossRowKind = 'section' | 'group' | 'ledger' | 'subtotal' | 'summary' | 'net';

/**
 * A single line in the Profit & Loss statement. The report is a flat, ordered
 * list of rows (mirroring the printed statement) carrying the three money
 * columns — Upto Previous / Current Period / Amount — plus a nesting `level`
 * for indentation and a `kind` that selects the row's emphasis.
 */
export interface ProfitLossRow {
  /** Left-column label, e.g. "Operating Revenue", "Sales", "Sub Total :". */
  label: string;
  /** "Upto Previous" column. */
  uptoPrevious: number;
  /** "Current Period" column. */
  currentPeriod: number;
  /** "Amount" column (cumulative). */
  amount: number;
  /** Nesting depth for indentation (0 = section, 1 = group, 2+ = ledger). */
  level: number;
  /** Visual role of the row. */
  kind: ProfitLossRowKind;
}

/**
 * Normalised Profit & Loss Account, modelled on the printed layout:
 * sections → groups (+ optional ledger detail) → Sub Total, interleaved with
 * Gross Profit / Net Profit summary rows, with Group / Upto Previous /
 * Current Period / Amount columns.
 */
export interface ProfitLossReport {
  companyName: string;
  title: string;
  fromDate: string;
  toDate: string;
  /** Cost-center filter label shown in the letterhead, e.g. "all". */
  costCenter: string;
  /** Detail level label shown in the letterhead, e.g. "Group". */
  level: string;
  rows: ProfitLossRow[];
}

/** Detail level for the Profit & Loss view: group totals, or with ledger detail. */
export type ProfitLossLevel = 'Group' | 'Ledger';

/** Filter query for the Profit & Loss endpoint. */
export interface ProfitLossQuery extends ReportDateQuery {
  /** Optional cost-center filter; null = all cost centers. */
  costCenter?: string | null;
  /** Detail level: group totals only, or with ledger detail. */
  level: ProfitLossLevel;
}
