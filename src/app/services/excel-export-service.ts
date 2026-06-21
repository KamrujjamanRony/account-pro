import { Service } from '@angular/core';

/** A single cell value in an exported sheet. Empty/blank cells use null/''. */
export type ExcelCell = string | number | null | undefined;

/** A row is an ordered list of cells. */
export type ExcelRow = ExcelCell[];

/**
 * Builds a genuine `.xlsx` (Office Open XML) workbook from a grid of rows and
 * triggers a download — with no third-party dependency. The file is assembled
 * as a store-only (uncompressed) ZIP of the minimal OOXML parts, so Excel,
 * LibreOffice and Google Sheets open it natively without a format warning.
 */
@Service()
export class ExcelExportService {
  /**
   * Download `rows` as an `.xlsx` file. Numbers are written as numeric cells;
   * everything else becomes text. `fileName` gains an `.xlsx` extension if it
   * lacks one. `sheetName` is clamped to Excel's 31-char tab-name limit.
   */
  download(fileName: string, rows: ExcelRow[], sheetName = 'Report'): void {
    const tab = this.sanitizeSheetName(sheetName);
    const encoder = new TextEncoder();
    const files: { name: string; data: Uint8Array }[] = [
      { name: '[Content_Types].xml', data: encoder.encode(this.contentTypesXml()) },
      { name: '_rels/.rels', data: encoder.encode(this.rootRelsXml()) },
      { name: 'xl/workbook.xml', data: encoder.encode(this.workbookXml(tab)) },
      { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(this.workbookRelsXml()) },
      { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(this.sheetXml(rows)) },
    ];
    const blob = new Blob([this.zip(files) as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    this.save(blob, this.ensureExtension(fileName, '.xlsx'));
  }

  // ── OOXML parts ──────────────────────────────────────────────────────────

  private sheetXml(rows: ExcelRow[]): string {
    const body = rows
      .map((row, r) => {
        const cells = row.map((cell, c) => this.cellXml(cell, c, r + 1)).join('');
        return `<row r="${r + 1}">${cells}</row>`;
      })
      .join('');
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      `<sheetData>${body}</sheetData></worksheet>`
    );
  }

  private cellXml(value: ExcelCell, col: number, row: number): string {
    const ref = `${this.columnName(col)}${row}`;
    if (value == null || value === '') return `<c r="${ref}"/>`;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return `<c r="${ref}"><v>${value}</v></c>`;
    }
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${this.escapeXml(String(value))}</t></is></c>`;
  }

  private contentTypesXml(): string {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '</Types>'
    );
  }

  private rootRelsXml(): string {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>'
    );
  }

  private workbookXml(sheetName: string): string {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<sheets><sheet name="${this.escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
      '</workbook>'
    );
  }

  private workbookRelsXml(): string {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '</Relationships>'
    );
  }

  // ── ZIP (store / no compression) ─────────────────────────────────────────

  private zip(files: { name: string; data: Uint8Array }[]): Uint8Array {
    const encoder = new TextEncoder();
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    for (const file of files) {
      const nameBytes = encoder.encode(file.name);
      const crc = this.crc32(file.data);
      const size = file.data.length;

      const header = new Uint8Array(30 + nameBytes.length);
      const hv = new DataView(header.buffer);
      hv.setUint32(0, 0x04034b50, true); // local file header signature
      hv.setUint16(4, 20, true); // version needed
      hv.setUint16(6, 0, true); // flags
      hv.setUint16(8, 0, true); // method = store
      hv.setUint16(10, 0, true); // mod time
      hv.setUint16(12, 0, true); // mod date
      hv.setUint32(14, crc, true);
      hv.setUint32(18, size, true); // compressed size
      hv.setUint32(22, size, true); // uncompressed size
      hv.setUint16(26, nameBytes.length, true);
      hv.setUint16(28, 0, true); // extra length
      header.set(nameBytes, 30);
      localParts.push(header, file.data);

      const central = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true); // central dir signature
      cv.setUint16(4, 20, true); // version made by
      cv.setUint16(6, 20, true); // version needed
      cv.setUint16(8, 0, true); // flags
      cv.setUint16(10, 0, true); // method
      cv.setUint16(12, 0, true); // mod time
      cv.setUint16(14, 0, true); // mod date
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true); // extra length
      cv.setUint16(32, 0, true); // comment length
      cv.setUint16(34, 0, true); // disk number
      cv.setUint16(36, 0, true); // internal attrs
      cv.setUint32(38, 0, true); // external attrs
      cv.setUint32(42, offset, true); // local header offset
      central.set(nameBytes, 46);
      centralParts.push(central);

      offset += header.length + size;
    }

    const centralSize = centralParts.reduce((n, p) => n + p.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); // end of central dir signature
    ev.setUint16(4, 0, true); // disk number
    ev.setUint16(6, 0, true); // disk with central dir
    ev.setUint16(8, files.length, true); // entries on this disk
    ev.setUint16(10, files.length, true); // total entries
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true); // central dir offset
    ev.setUint16(20, 0, true); // comment length

    return this.concat([...localParts, ...centralParts, end]);
  }

  private crc32(data: Uint8Array): number {
    let crc = ~0;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let bit = 0; bit < 8; bit++) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return (~crc) >>> 0;
  }

  private concat(parts: Uint8Array[]): Uint8Array {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const part of parts) {
      out.set(part, pos);
      pos += part.length;
    }
    return out;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Convert a 0-based column index to its spreadsheet letter (0→A, 26→AA). */
  private columnName(index: number): string {
    let name = '';
    let n = index;
    do {
      name = String.fromCharCode(65 + (n % 26)) + name;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return name;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Excel forbids \ / ? * [ ] : in tab names and caps them at 31 chars. */
  private sanitizeSheetName(name: string): string {
    const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim();
    return (cleaned || 'Report').slice(0, 31);
  }

  private ensureExtension(name: string, ext: string): string {
    return name.toLowerCase().endsWith(ext) ? name : name + ext;
  }

  private save(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
