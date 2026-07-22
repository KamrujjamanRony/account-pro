import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { appStorage, STORAGE_KEYS } from '../lib/storage';
import { darkPalette, lightPalette, Palette } from '../config/theme';

type ThemePref = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  palette: Palette;
  pref: ThemePref;
  isDark: boolean;
  toggle: () => void;
  setPref: (pref: ThemePref) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    appStorage.get(STORAGE_KEYS.theme).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setPrefState(stored);
    });
  }, []);

  const setPref = (next: ThemePref) => {
    setPrefState(next);
    void appStorage.set(STORAGE_KEYS.theme, next);
  };

  const isDark = pref === 'system' ? system === 'dark' : pref === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({
      palette: isDark ? darkPalette : lightPalette,
      pref,
      isDark,
      toggle: () => setPref(isDark ? 'light' : 'dark'),
      setPref,
    }),
    [isDark, pref],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
