/** Money / number / date formatting helpers shared across screens. */

const moneyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a number as money (2 dp, thousands separators). Blank for 0 by option. */
export function money(value: number | null | undefined, blankZero = false): string {
  const n = value ?? 0;
  if (blankZero && n === 0) return '';
  return moneyFormatter.format(n);
}

/** Compact money for KPI tiles (e.g. 1.2K, 3.4M). */
export function compactMoney(value: number | null | undefined): string {
  const n = value ?? 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return moneyFormatter.format(n);
}

/** Render a date-ish value as `dd-MMM-yyyy`; passes through non-dates. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${day}-${month}-${d.getFullYear()}`;
}

/** ISO `yyyy-MM-dd` for a Date. */
export function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function startOfYearIso(): string {
  return toIsoDate(new Date(new Date().getFullYear(), 0, 1));
}
