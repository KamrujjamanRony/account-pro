import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User, UserSearchQuery } from '../models/user.model';

@Service()
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/User`;

  search(query: UserSearchQuery): Observable<User[]> {
    return this.http.post<User[]>(`${this.baseUrl}/Search`, query);
  }

  /** The Accounts API exposes get-by-id as a POST. */
  getById(id: number): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/${id}`, {});
  }

  add(user: User): Observable<User> {
    return this.http.post<User>(this.baseUrl, user);
  }

  update(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/${id}`, user);
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
