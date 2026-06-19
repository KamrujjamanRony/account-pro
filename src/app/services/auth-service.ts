import { inject, Service, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { AuthResult, LoginRequest, User } from '../models/user.model';

@Service()
export class AuthService {
  private storageKey = '*_*';
  private tokenCookie = 'auth_token';
  private refreshCookie = 'refresh_token';
  private router = inject(Router);
  private http = inject(HttpClient);
  private loginUrl = `${environment.apiUrl}/Authentication/Login`;
  private refreshUrl = `${environment.apiUrl}/Authentication/RefreshToken`;

  /** Reactive copy of the signed-in user (null when logged out). */
  readonly currentUser = signal<User | null>(null);

  /** In-flight refresh, shared so concurrent 401s trigger a single call. */
  private refresh$: Observable<string> | null = null;

  constructor() {
    this.restoreUser();
    window.addEventListener('beforeunload', () => this.backupUser());
  }

  /** Authenticate against the API and sign the user in on success. */
  login(credentials: LoginRequest): Observable<User> {
    return this.http
      .post<ApiResponse<AuthResult>>(this.loginUrl, credentials)
      .pipe(map(res => this.signIn(res?.data)));
  }

  /** Build + store the signed-in user from a login auth result. */
  private signIn(data: AuthResult | undefined): User {
    const auth = data ?? ({} as AuthResult);
    const user: User = {
      username: auth.username,
      userName: auth.username,
      isActive: true,
      menuPermissions: [],
      userMenu: auth.userMenu ?? [],
      token: auth.token,
    };
    this.storeTokens(auth);
    if (!auth.token) {
      console.warn('[auth] no token in login response — API calls will be unauthenticated');
    }
    this.currentUser.set(user);
    this.backupUser();
    return user;
  }

  /**
   * Exchange the refresh token for a fresh access token. Shared (single-flight)
   * so multiple concurrent 401s only trigger one network call. Signs the user
   * out if there's no refresh token or the exchange fails.
   *
   * NOTE: endpoint + payload shape (`Authentication/RefreshToken` with
   * `{ token, refreshToken }`) are assumptions — adjust to match the API.
   */
  refreshToken(): Observable<string> {
    if (this.refresh$) return this.refresh$;

    const refreshToken = this.getRefreshToken();
    const token = this.currentUser()?.token ?? this.getToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available.'));
    }

    this.refresh$ = this.http
      .post<ApiResponse<AuthResult>>(this.refreshUrl, { token, refreshToken })
      .pipe(
        map(res => {
          const data = res?.data;
          if (!data?.token) throw new Error('No token in refresh response.');
          this.storeTokens(data);
          const user = this.currentUser();
          if (user) {
            this.currentUser.set({
              ...user,
              token: data.token,
              userMenu: data.userMenu?.length ? data.userMenu : user.userMenu,
            });
            this.backupUser();
          }
          return data.token;
        }),
        catchError(err => {
          this.logout();
          return throwError(() => err);
        }),
        finalize(() => (this.refresh$ = null)),
        shareReplay(1),
      );
    return this.refresh$;
  }

  /** JWT for the signed-in user, read from the cookie. */
  getToken(): string | null {
    return this.readCookie(this.tokenCookie);
  }

  /** Refresh token, read from the cookie. */
  getRefreshToken(): string | null {
    return this.readCookie(this.refreshCookie);
  }

  getUser(): User | null {
    return this.currentUser();
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  logout() {
    this.refresh$ = null;
    this.currentUser.set(null);
    localStorage.removeItem(this.storageKey);
    this.deleteCookie(this.tokenCookie);
    this.deleteCookie(this.refreshCookie);
    this.router.navigate(['/login']);
  }

  /** Persist the access + refresh tokens as cookies, scoped to their lifetimes. */
  private storeTokens(auth: AuthResult): void {
    if (auth.token) {
      this.writeCookie(this.tokenCookie, auth.token, this.secondsUntil(auth.expiration, 60 * 60));
    }
    if (auth.refreshToken) {
      this.writeCookie(
        this.refreshCookie,
        auth.refreshToken,
        this.secondsUntil(auth.refreshTokenExpiration, 60 * 60 * 24 * 7),
      );
    }
  }

  /** Seconds from now until `iso`, or `fallback` when missing/past/invalid. */
  private secondsUntil(iso: string | undefined, fallback: number): number {
    if (!iso) return fallback;
    const ms = new Date(iso).getTime();
    if (Number.isNaN(ms)) return fallback;
    const seconds = Math.floor((ms - Date.now()) / 1000);
    return seconds > 0 ? seconds : fallback;
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

  private writeCookie(name: string, value: string, maxAgeSeconds: number) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie =
      `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Strict${secure}`;
  }

  private readCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  private deleteCookie(name: string) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Strict`;
  }
}
