import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

/** User-selectable theme preference. `system` follows the OS setting. */
export type ThemePreference = 'light' | 'dark' | 'system';

/** The actually-applied theme after resolving `system`. */
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'account-pro-theme';

/**
 * Owns the application colour theme. The preference (light/dark/system) is
 * persisted to localStorage and the resolved theme is reflected onto the
 * `.dark` class of <html>, which drives every Tailwind `dark:` variant.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)');

  /** Tracks the OS preference so `system` mode reacts to live changes. */
  private readonly systemPrefersDark = signal(this.media?.matches ?? false);

  /** The user's chosen preference. */
  readonly preference = signal<ThemePreference>(this.readStoredPreference());

  /** The theme currently applied to the document. */
  readonly resolvedTheme = computed<ResolvedTheme>(() => {
    const pref = this.preference();
    if (pref === 'system') {
      return this.systemPrefersDark() ? 'dark' : 'light';
    }
    return pref;
  });

  /** Convenience flag for templates. */
  readonly isDark = computed(() => this.resolvedTheme() === 'dark');

  constructor() {
    // Keep `system` mode in sync with live OS changes.
    this.media?.addEventListener('change', event => this.systemPrefersDark.set(event.matches));

    // Reflect the resolved theme onto <html> and persist the preference.
    effect(() => {
      const root = this.document.documentElement;
      root.classList.toggle('dark', this.resolvedTheme() === 'dark');
      this.document.defaultView?.localStorage?.setItem(STORAGE_KEY, this.preference());
    });
  }

  /** Explicitly set the theme preference. */
  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
  }

  /** Flip between light and dark (resolving `system` to its current value). */
  toggle(): void {
    this.preference.set(this.resolvedTheme() === 'dark' ? 'light' : 'dark');
  }

  private readStoredPreference(): ThemePreference {
    const stored = this.document.defaultView?.localStorage?.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  }
}
