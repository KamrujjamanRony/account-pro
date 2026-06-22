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
 *
 * A real Ctrl+F5 (bypassing the HTTP cache) cannot be triggered from JS, so we
 * emulate it: purge the Cache Storage and unregister any service worker before
 * reloading, which forces the browser to refetch the shell and chunks.
 */
async function hardReload(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
  } catch {
    // Best-effort cache purge — reload regardless of whether it succeeded.
  } finally {
    location.reload();
  }
}

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
  void hardReload();
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
