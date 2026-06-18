import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth-interceptor';
import { environment } from '../environments/environment';

/**
 * Fire-and-forget "ping" to the API so its (potentially cold) app pool starts
 * spinning up while the login screen renders, instead of paying the full
 * cold-start cost on the user's first real request. We do NOT await this — the
 * response is irrelevant (even a 401/404 still warms the backend pipeline) and
 * bootstrap must not block on it.
 */
function warmUpApi(): void {
  fetch(`${environment.apiUrl}/`, { method: 'GET', credentials: 'omit' }).catch(() => { });
}


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => warmUpApi()),
  ],
};
