import { api } from '../api/client';
import { User, UserSearchQuery } from '../models/user';

const base = '/User';

/** The User endpoints return raw payloads (no ApiResponse envelope). */
export const userService = {
  search: (query: UserSearchQuery) => api.post<User[]>(`${base}/Search`, query),
  getById: (id: number) => api.post<User>(`${base}/${id}`, {}),
  add: (user: User) => api.post<User>(base, user),
  update: (id: number, user: User) => api.put<User>(`${base}/${id}`, user),
  delete: (id: number) => api.delete<unknown>(`${base}/${id}`),
};
