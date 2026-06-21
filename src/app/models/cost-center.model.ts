/** A cost center used to tag transactions for departmental reporting. */
export interface CostCenter {
  id?: number;
  code: string;
  name: string;
  note?: string | null;
  isActive: boolean;
  postBy?: string;
  updateBy?: string;
}

export interface CostCenterSearchQuery {
  id?: number | null;
  search?: string | null;
  activeOnly?: boolean;
}
