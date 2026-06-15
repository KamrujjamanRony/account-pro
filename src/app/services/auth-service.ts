import { inject, Service, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoginRequest, MenuPermissionNode, User } from '../models/user.model';

@Service()
export class AuthService {
  private storageKey = '*_*';
  private tokenCookie = 'auth_token';
  private router = inject(Router);
  private http = inject(HttpClient);
  private loginUrl = `${environment.apiUrl}/Authentication/Login`;

  /** Authenticate against the API and sign the user in on success. */
  login(credentials: LoginRequest): Observable<User> {
    return this.http
      .post<User>(this.loginUrl, credentials, { observe: 'response' })
      .pipe(map(res => {
        const user = (res.body ?? {}) as User;
        // Some APIs return the JWT in the Authorization header instead of the body.
        const headerToken = res.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
        this.setUser({ ...user, password: undefined }, headerToken ?? undefined);
        return user;
      }));
  }

  /** JWT for the signed-in user, read from the cookie. */
  getToken(): string | null {
    return this.readCookie(this.tokenCookie);
  }

  /** Recursively scan the login response for a JWT-shaped value (`a.b.c`). */
  private extractToken(value: unknown, depth = 0): string | undefined {
    if (depth > 5 || value == null) return undefined;
    if (typeof value === 'string') {
      return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
        ? value
        : undefined;
    }
    if (typeof value === 'object') {
      for (const child of Object.values(value as Record<string, unknown>)) {
        const found = this.extractToken(child, depth + 1);
        if (found) return found;
      }
    }
    return undefined;
  }

  /** Reactive copy of the signed-in user (null when logged out). */
  readonly currentUser = signal<User | null>(null);

  constructor() {
    this.restoreUser();
    window.addEventListener('beforeunload', () => this.backupUser());
  }

  setUser(user: User, explicitToken?: string) {
    const token = explicitToken ?? this.extractToken(user);
    if (token) {
      this.writeCookie(this.tokenCookie, token);
    } else {
      console.warn('[auth] no JWT found in login response — API calls will be unauthenticated');
    }
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
    this.deleteCookie(this.tokenCookie);
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

  private writeCookie(name: string, value: string) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie =
      `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict${secure}`;
  }

  private readCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  private deleteCookie(name: string) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Strict`;
  }
}
