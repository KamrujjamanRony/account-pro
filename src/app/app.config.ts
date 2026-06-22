import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withNavigationErrorHandler, type NavigationError } from '@angular/router';
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

/**
 * After a redeploy the lazy-loaded chunk filenames change (new content hashes),
 * so a browser still running the previous build requests chunks that no longer
 * exist on the server and gets a 404 / "Failed to fetch dynamically imported
 * module". Detect that specific failure and do a one-time hard reload to pull
 * the fresh index.html and its current chunk references. The sessionStorage flag
 * prevents an infinite reload loop if the failure is not actually deploy-related.
 */
function handleChunkLoadError(navError: NavigationError): void {
  const message = String(navError.error?.message ?? navError.error ?? '');
  const isChunkLoadError =
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
      message,
    );

  if (!isChunkLoadError) {
    return;
  }

  const RELOAD_FLAG = 'app:chunk-reload';
  if (sessionStorage.getItem(RELOAD_FLAG)) {
    sessionStorage.removeItem(RELOAD_FLAG);
    return;
  }

  sessionStorage.setItem(RELOAD_FLAG, '1');
  location.reload();
}


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withNavigationErrorHandler(handleChunkLoadError)),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => warmUpApi()),
  ],
};
