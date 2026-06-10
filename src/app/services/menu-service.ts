import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Menu, MenuTreeNode } from '../models/menu.model';

@Service()
export class MenuService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/Menu`;

  search(payload: Record<string, unknown> = {}): Observable<Menu[]> {
    return this.http.post<Menu[]>(`${this.baseUrl}/Search`, payload);
  }

  getById(id: number): Observable<Menu> {
    return this.http.get<Menu>(`${this.baseUrl}/${id}`);
  }

  add(menu: Menu): Observable<Menu> {
    return this.http.post<Menu>(this.baseUrl, menu);
  }

  update(id: number, menu: Menu): Observable<Menu> {
    return this.http.put<Menu>(`${this.baseUrl}/${id}`, menu);
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  /** Hierarchical menu tree with the given user's selections applied. */
  generateTree(userId: number): Observable<MenuTreeNode[]> {
    return this.http.get<MenuTreeNode[]>(`${this.baseUrl}/GenerateTreeData`, {
      params: { userId },
    });
  }
}
