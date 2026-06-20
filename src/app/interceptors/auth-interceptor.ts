import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth-service';
import { environment } from '../../environments/environment';

/** Clone a request with the given Bearer token attached. */
function withToken<T>(req: HttpRequest<T>, token: string): HttpRequest<T> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Attaches the JWT (from the auth cookie) as a Bearer token on every API
 * request. On a 401, transparently refreshes the access token using the
 * refresh token and retries the request once; if the refresh fails the user
 * is signed out (handled inside {@link AuthService.refreshToken}).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Only decorate calls to our own API; never the auth endpoints themselves.
  const isApiCall = req.url.startsWith(environment.apiUrl);
  const isLogin = req.url.includes('/Authentication/Login');
  const isRefresh = req.url.includes('/Authentication/refresh-token');
  const decorate = isApiCall && !isLogin && !isRefresh;

  const token = auth.getToken();
  const authReq = decorate && token ? withToken(req, token) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || !decorate) {
        return throwError(() => err);
      }
      // Token rejected — try a single refresh + retry.
      return auth.refreshToken().pipe(
        switchMap(newToken => next(withToken(req, newToken))),
      );
    }),
  );
};
