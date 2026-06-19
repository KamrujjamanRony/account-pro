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
  /** C. Closing balance row (Payment = closing cash/bank carried forward). */
  closing: CashBookLine | null;
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
