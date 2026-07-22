/** A chart-of-account record (flat). */
export interface ChartOfAccount {
  id?: number;
  parentId: number | null;
  name: string;
  nature?: string | null;
  isActive: boolean;
  code?: string;
}

/** A chart-of-account node with its children (Tree endpoint). */
export interface ChartTreeNode extends ChartOfAccount {
  id: number;
  children: ChartTreeNode[];
}

export interface ChartSearchQuery {
  id?: number | null;
  parentId?: number | null;
  onlyLeaf?: boolean;
  search?: string | null;
}

/** Account nature options for root (level-1) accounts. */
export const ACCOUNT_NATURES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'] as const;
export type AccountNature = (typeof ACCOUNT_NATURES)[number];
