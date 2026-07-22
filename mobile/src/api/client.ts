import { environment } from '../config/env';
import { secureStorage, STORAGE_KEYS } from '../lib/storage';
import { ApiResponse } from '../models/api-response';
import { AuthResult } from '../models/user';

/** Error thrown by the API client, carrying the HTTP status for callers. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// In-memory mirror of the persisted tokens, so requests avoid an async read.
let accessToken: string | null = null;
let refreshTokenValue: string | null = null;

// Single-flight refresh: concurrent 401s share one refresh call.
let refreshInFlight: Promise<string> | null = null;

// Hooks the AuthContext registers so it can react to refresh / forced logout.
let onLogout: (() => void) | null = null;
let onTokensRefreshed: ((auth: AuthResult) => void) | null = null;

export const authClient = {
  setTokens(token: string | null, refresh: string | null) {
    accessToken = token;
    refreshTokenValue = refresh;
  },
  getToken() {
    return accessToken;
  },
  registerCallbacks(cbs: { onLogout: () => void; onTokensRefreshed: (auth: AuthResult) => void }) {
    onLogout = cbs.onLogout;
    onTokensRefreshed = cbs.onTokensRefreshed;
  },
  async persistTokens(auth: AuthResult) {
    accessToken = auth.token ?? accessToken;
    refreshTokenValue = auth.refreshToken ?? refreshTokenValue;
    if (auth.token) await secureStorage.set(STORAGE_KEYS.token, auth.token);
    if (auth.refreshToken) await secureStorage.set(STORAGE_KEYS.refresh, auth.refreshToken);
  },
  async loadTokens() {
    accessToken = await secureStorage.get(STORAGE_KEYS.token);
    refreshTokenValue = await secureStorage.get(STORAGE_KEYS.refresh);
    return { token: accessToken, refresh: refreshTokenValue };
  },
  async clearTokens() {
    accessToken = null;
    refreshTokenValue = null;
    await secureStorage.remove(STORAGE_KEYS.token);
    await secureStorage.remove(STORAGE_KEYS.refresh);
  },
};

function isAuthEndpoint(path: string): boolean {
  return path.includes('/Authentication/Login') || path.includes('/Authentication/refresh-token');
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Exchange the refresh token for a fresh access token. Shared (single-flight)
 * so multiple concurrent 401s only trigger one network call. Signs the user out
 * if there's no refresh token or the exchange fails.
 */
function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;
  if (!refreshTokenValue) {
    onLogout?.();
    return Promise.reject(new ApiError(401, 'No refresh token available.'));
  }

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${environment.apiUrl}/Authentication/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken, refreshToken: refreshTokenValue }),
      });
      const body = (await parseBody(res)) as ApiResponse<AuthResult> | null;
      const data = body?.data;
      if (!res.ok || !data?.token) throw new ApiError(res.status, 'No token in refresh response.');
      await authClient.persistTokens(data);
      onTokensRefreshed?.(data);
      return data.token;
    } catch (err) {
      onLogout?.();
      throw err instanceof ApiError ? err : new ApiError(401, 'Token refresh failed.');
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function doFetch(
  method: HttpMethod,
  path: string,
  body: unknown,
  token: string | null,
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const decorate = !isAuthEndpoint(path);
  if (decorate && token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${environment.apiUrl}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

/**
 * Core request helper. Attaches the JWT as a Bearer token on API calls, and on
 * a 401 transparently refreshes the token and retries the request once. Mirrors
 * the Angular `authInterceptor`.
 */
export async function apiRequest<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const decorate = !isAuthEndpoint(path);
  let res = await doFetch(method, path, body, accessToken);

  if (res.status === 401 && decorate) {
    const newToken = await refreshAccessToken();
    res = await doFetch(method, path, body, newToken);
  }

  const payload = await parseBody(res);
  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : undefined) ?? `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, payload);
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>('GET', path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => apiRequest<T>('PUT', path, body),
  delete: <T>(path: string) => apiRequest<T>('DELETE', path),
};

/** Build a querystring from a params object (skips null/undefined). */
export function toQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}
