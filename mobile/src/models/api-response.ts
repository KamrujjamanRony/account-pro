/** Standard API envelope returned by the Accounts API. */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Paged payload used by search endpoints that return `data: { items: [...] }`. */
export interface PagedResult<T> {
  items: T[];
  totalCount?: number;
  pageNumber?: number;
  pageSize?: number;
}
