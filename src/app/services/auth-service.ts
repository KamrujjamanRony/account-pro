import { inject, Service, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoginRequest, MenuPermissionNode, User } from '../models/user.model';

@Service()
export class AuthService {
  private storageKey = '*_*';
  private router = inject(Router);
  private http = inject(HttpClient);
  private loginUrl = `${environment.apiUrl}/Authentication/Login`;

  /** Authenticate against the API and sign the user in on success. */
  login(credentials: LoginRequest): Observable<User> {
    return this.http
      .post<User>(this.loginUrl, credentials)
      .pipe(tap(user => this.setUser({ ...user, password: undefined })));
  }

  /** Reactive copy of the signed-in user (null when logged out). */
  readonly currentUser = signal<User | null>(null);

  constructor() {
    this.restoreUser();
    window.addEventListener('beforeunload', () => this.backupUser());
  }

  setUser(user: User) {
    this.currentUser.set(user);
    this.backupUser();
  }

  getUser(): User | null {
    return this.currentUser();
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  /** Whether the signed-in user holds `action` permission on the named menu. */
  hasPermission(menuName: string, action: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    const node = this.findNode(user.menuPermissions ?? [], menuName);
    if (!node || !node.isSelected) return false;
    return node.permissionsKey.some(p => p.permission === action && p.isSelected);
  }

  logout() {
    this.currentUser.set(null);
    localStorage.removeItem(this.storageKey);
    this.router.navigate(['/login']);
  }

  private findNode(nodes: MenuPermissionNode[], menuName: string): MenuPermissionNode | undefined {
    for (const node of nodes) {
      if (node.menuName === menuName) return node;
      const found = this.findNode(node.children ?? [], menuName);
      if (found) return found;
    }
    return undefined;
  }

  private backupUser() {
    const user = this.currentUser();
    if (user) {
      try {
        const json = JSON.stringify(user);
        const encoded = btoa(encodeURIComponent(json));
        localStorage.setItem(this.storageKey, encoded);
      } catch {}
    }
  }

  private restoreUser() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const json = decodeURIComponent(atob(stored));
        this.currentUser.set(JSON.parse(json) as User);
      } catch {
        localStorage.removeItem(this.storageKey);
      }
    }
  }
}
