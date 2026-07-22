import { api, toQuery } from '../api/client';
import { Menu, MenuTreeNode } from '../models/menu';

const base = '/Menu';

/** The Menu endpoints return raw payloads (no ApiResponse envelope). */
export const menuService = {
  search: (payload: Record<string, unknown> = {}) => api.post<Menu[]>(`${base}/Search`, payload),
  getById: (id: number) => api.get<Menu>(`${base}/${id}`),
  add: (menu: Menu) => api.post<Menu>(base, menu),
  update: (id: number, menu: Menu) => api.put<Menu>(`${base}/${id}`, menu),
  delete: (id: number) => api.delete<unknown>(`${base}/${id}`),
  generateTree: (userId: number) =>
    api.get<MenuTreeNode[]>(`${base}/GenerateTreeData${toQuery({ userId })}`),
};
