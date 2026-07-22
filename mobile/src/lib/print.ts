import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Open the OS print dialog for the given HTML (used by reports & vouchers). */
export async function printHtml(html: string): Promise<void> {
  await Print.printAsync({ html });
}

/** Render the HTML to a PDF and open the share sheet, so it can be saved/sent. */
export async function sharePdf(html: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
    await Print.printAsync({ uri });
    return;
  }
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share PDF' });
}

/** Shared print-document CSS + wrapper so every printed report looks consistent. */
export function printDocument(title: string, bodyHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Roboto, Arial, sans-serif; color: #0f172a; padding: 16px; font-size: 12px; }
    h1 { font-size: 18px; text-align: center; margin: 0; }
    .addr { text-align: center; color: #64748b; margin: 2px 0; }
    .title { text-align: center; font-size: 14px; font-weight: 700; margin-top: 8px; }
    .range { text-align: center; color: #64748b; margin: 2px 0 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #cbd5e1; padding: 4px 6px; }
    th { background: #f1f5f9; text-align: left; }
    .r { text-align: right; }
    .c { text-align: center; }
    .b { font-weight: 700; }
    .band { background: #eef2ff; font-weight: 700; }
    .muted { color: #64748b; }
    tfoot td { font-weight: 700; background: #f8fafc; }
  </style></head><body>${bodyHtml}</body></html>`;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
