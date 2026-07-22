/** Design tokens shared across screens, in a light and a dark variant. */
export interface Palette {
  mode: 'light' | 'dark';
  bg: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  debit: string;
  credit: string;
  overlay: string;
}

export const lightPalette: Palette = {
  mode: 'light',
  bg: '#f1f5f9',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  primary: '#4f46e5',
  primarySoft: '#eef2ff',
  onPrimary: '#ffffff',
  success: '#059669',
  danger: '#e11d48',
  warning: '#d97706',
  info: '#0284c7',
  debit: '#2563eb',
  credit: '#dc2626',
  overlay: 'rgba(15, 23, 42, 0.45)',
};

export const darkPalette: Palette = {
  mode: 'dark',
  bg: '#0b1120',
  surface: '#111827',
  surfaceAlt: '#0f1729',
  card: '#1e293b',
  border: '#334155',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  primary: '#818cf8',
  primarySoft: '#1e1b4b',
  onPrimary: '#0b1120',
  success: '#34d399',
  danger: '#fb7185',
  warning: '#fbbf24',
  info: '#38bdf8',
  debit: '#60a5fa',
  credit: '#f87171',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};
