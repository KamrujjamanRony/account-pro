/** Depreciation method: Straight-Line or Written-Down-Value (reducing balance). */
export type DepreciationMethod = 'SL' | 'WDV';

/** Lifecycle state of a fixed asset. */
export type AssetStatus = 'Active' | 'Disposed';

/** A fixed asset tracked for depreciation and disposal. */
export interface Asset {
  id?: number;
  assetName: string;
  category?: string | null;
  location?: string | null;
  serialNo?: string | null;
  /** Ledger the asset cost is capitalised to. */
  assetLedgerId: number;
  /** Contra-asset ledger holding accumulated depreciation. */
  accumulatedDepLedgerId: number;
  /** Expense ledger charged with periodic depreciation. */
  depExpenseLedgerId: number;
  purchaseDate: string;
  depreciationStartDate: string;
  cost: number;
  salvageValue: number;
  method: DepreciationMethod;
  /** Useful life in months (used by the SL method). */
  usefulLifeMonths: number;
  /** Annual depreciation rate percent (used by the WDV method). */
  ratePercent: number;
  note?: string | null;
  isActive: boolean;
  postBy?: string;
  updateBy?: string;

  // ---- read-only fields the API echoes back on search/get ----
  status?: AssetStatus | string | null;
  accumulatedDepreciation?: number | null;
  netBookValue?: number | null;
  disposalDate?: string | null;
  disposalAmount?: number | null;
  assetLedgerName?: string | null;
  accumulatedDepLedgerName?: string | null;
  depExpenseLedgerName?: string | null;
}

export interface AssetSearchQuery {
  assetName?: string | null;
  category?: string | null;
  /** "Active" | "Disposed" | null for all. */
  status?: AssetStatus | string | null;
}

/** Payload for the RunDepreciation endpoint. */
export interface RunDepreciationRequest {
  asOfDate: string;
  /** A single asset, or null to run for every active asset. */
  assetId?: number | null;
  postBy?: string;
}

/** Payload for disposing of an asset. */
export interface DisposeAssetRequest {
  disposalDate: string;
  disposalAmount: number;
  /** Ledger that receives the sale proceeds (cash/bank/receivable). */
  receivedInLedgerId: number;
  /** Ledger that absorbs the gain or loss on disposal. */
  gainLossLedgerId: number;
  /** Post depreciation up to the disposal date before removing the asset. */
  depreciateUpToDisposal: boolean;
  postBy?: string;
}
