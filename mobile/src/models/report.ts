/** A single Receipt & Payment row in a Cash Book / Bank Book report. */
export interface CashBookLine {
  date: string;
  voucherId: string;
  reference: string;
  ledger: string;
  narration: string;
  receipt: number;
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
  opening: CashBookLine[];
  transactions: CashBookLine[];
  closing: CashBookLine[];
  subTotalReceipt: number;
  subTotalPayment: number;
  grandTotalReceipt: number;
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
  ledger: string;
  receipt: number;
  payment: number;
}

export interface RpsGroup {
  groupName: string;
  lines: RpsLine[];
  subTotalReceipt: number;
  subTotalPayment: number;
}

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
  companyName: string;
  title: string;
  option: string;
  fromDate: string;
  toDate: string;
  openingCashBank: RpsSection;
  receiptPayment: RpsSection;
  closingCashBank: RpsSection;
  grandTotalReceipt: number;
  grandTotalPayment: number;
}

/** Filter query for the Receipt & Payment Statement endpoint. */
export interface ReceiptPaymentQuery extends ReportDateQuery {
  groupName?: string | null;
  ledger?: string | null;
}

/** A debit/credit pair shown under one of the Trial Balance balance columns. */
export interface DebitCredit {
  debit: number;
  credit: number;
}

/** Opening / Current / Closing debit-credit totals for a line, group or section. */
export interface TrialBalanceTotals {
  opening: DebitCredit;
  period: DebitCredit;
  closing: DebitCredit;
}

export interface TrialBalanceLine extends TrialBalanceTotals {
  ledgerCode: string;
  ledgerName: string;
  groupName: string;
}

export interface TrialBalanceGroup {
  groupName: string;
  lines: TrialBalanceLine[];
  subTotal: TrialBalanceTotals;
}

export interface TrialBalanceSection {
  nature: string;
  groups: TrialBalanceGroup[];
  total: TrialBalanceTotals;
}

export interface TrialBalanceReport {
  companyName: string;
  title: string;
  fromDate: string;
  toDate: string;
  sections: TrialBalanceSection[];
  grandTotal: TrialBalanceTotals;
}

export interface TrialBalanceQuery extends ReportDateQuery {
  ledger?: string | null;
  groupName?: string | null;
}

/** Which side a running balance sits on. Empty when there is no balance. */
export type BalanceSide = 'Dr' | 'Cr' | '';

export interface GeneralLedgerLine {
  date: string;
  voucherNo: string;
  narration: string;
  shortNarration: string;
  debit: number;
  credit: number;
  balance: number;
  balanceSide: BalanceSide;
  isOpening: boolean;
}

export interface GeneralLedgerAccount {
  ledgerName: string;
  lines: GeneralLedgerLine[];
  subTotalDebit: number;
  subTotalCredit: number;
  hasSubTotal: boolean;
}

export interface GeneralLedgerGroup {
  groupName: string;
  accounts: GeneralLedgerAccount[];
  summaryDebit: number;
  summaryCredit: number;
  closingBalance: number;
  closingSide: BalanceSide;
}

export interface GeneralLedgerReport {
  companyName: string;
  title: string;
  fromDate: string;
  toDate: string;
  costCenter: string;
  groups: GeneralLedgerGroup[];
}

export interface GeneralLedgerQuery extends ReportDateQuery {
  groupName?: number[] | null;
  ledger?: number[] | null;
  costCenter?: string | null;
}

export interface DayBookDetail {
  groupName: string;
  ledgerName: string;
  shortNarration: string;
  debit: number;
  credit: number;
}

export interface DayBookVoucher {
  voucherId: string;
  date: string;
  type: string;
  reference: string;
  costCenter: string;
  narration: string;
  details: DayBookDetail[];
  subTotalDebit: number;
  subTotalCredit: number;
}

export interface DayBookSection {
  sectionName: string;
  vouchers: DayBookVoucher[];
  summaryDebit: number;
  summaryCredit: number;
}

export interface DayBookReport {
  companyName: string;
  title: string;
  fromDate: string;
  toDate: string;
  sections: DayBookSection[];
}

export interface DayBookQuery extends ReportDateQuery {
  type?: string | null;
  groupName?: number[] | null;
  ledger?: number[] | null;
  costCenter?: string | null;
}

export interface BalanceSheetLedger {
  ledgerCode: string;
  name: string;
  amount: number;
}

export interface BalanceSheetGroup {
  groupName: string;
  amount: number;
  ledgers: BalanceSheetLedger[];
}

export interface BalanceSheetSection {
  sectionName: string;
  groups: BalanceSheetGroup[];
  subTotal: number;
}

export interface BalanceSheetSide {
  title: string;
  sections: BalanceSheetSection[];
  summary: number;
}

export interface BalanceSheetReport {
  companyName: string;
  title: string;
  asOfDate: string;
  fiscalYearStart: string;
  assets: BalanceSheetSide;
  liabilities: BalanceSheetSide;
  difference: number;
  isBalanced: boolean;
}

export type BalanceSheetLevel = 'group' | 'detail';

export interface BalanceSheetQuery {
  asOfDate: string;
  fiscalYearStart: string;
}

export type ProfitLossRowKind = 'section' | 'group' | 'ledger' | 'subtotal' | 'summary' | 'net';

export interface ProfitLossRow {
  label: string;
  uptoPrevious: number;
  currentPeriod: number;
  amount: number;
  level: number;
  kind: ProfitLossRowKind;
}

export interface ProfitLossReport {
  companyName: string;
  title: string;
  fromDate: string;
  toDate: string;
  costCenter: string;
  level: string;
  rows: ProfitLossRow[];
}

export type ProfitLossLevel = 'Group' | 'Ledger';

export interface ProfitLossQuery extends ReportDateQuery {
  costCenter?: string | null;
  level: ProfitLossLevel;
}
