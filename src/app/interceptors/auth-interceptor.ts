import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth-service';
import { environment } from '../../environments/environment';

/**
 * Attaches the JWT (from the auth cookie) as a Bearer token on every API
 * request, and signs the user out when the API rejects the token.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  // Only decorate calls to our own API, and never the login request itself.
  const isApiCall = req.url.startsWith(environment.apiUrl);
  const isLogin = req.url.includes('/Authentication/Login');

  const willAttach = !!token && isApiCall && !isLogin;
  // TEMP diagnostic.
  console.log('[auth] →', req.method, req.url, '| token attached:', willAttach);

  const authReq = willAttach
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isLogin) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
