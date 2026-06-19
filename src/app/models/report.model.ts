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
  /** A. Opening balance row (Receipt = opening cash/bank in hand). */
  opening: CashBookLine | null;
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
