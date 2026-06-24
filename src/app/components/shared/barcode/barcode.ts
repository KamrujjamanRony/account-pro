import { Component, computed, input } from '@angular/core';

/** A single dark bar positioned within the barcode's module grid. */
interface Bar {
  x: number;
  width: number;
}

/**
 * Code 128 (subset B) barcode rendered as an inline SVG. Being vector, it stays
 * crisp on screen and prints sharply, so scanners read it reliably from a
 * printed voucher. Pass the value to encode via {@link value}; the optional
 * {@link barHeight} and {@link moduleWidth} tune the rendered size.
 *
 * Usage:
 * ```html
 * <app-barcode [value]="v.voucherNo" />
 * ```
 */
@Component({
  selector: 'app-barcode',
  template: `
    @if (bars().length) {
      <svg
        class="block"
        [attr.width]="totalWidth()"
        [attr.height]="barHeight()"
        [attr.viewBox]="'0 0 ' + totalWidth() + ' ' + barHeight()"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        [attr.aria-label]="'Barcode: ' + value()"
      >
        @for (bar of bars(); track $index) {
          <rect [attr.x]="bar.x" y="0" [attr.width]="bar.width" [attr.height]="barHeight()" fill="#000" />
        }
      </svg>
    }
  `,
})
export class Barcode {
  /** The text to encode (Code 128 subset B: ASCII 32–126). */
  readonly value = input('');

  /** Height of the bars, in pixels. */
  readonly barHeight = input(18);

  /** Width of a single (narrow) module, in pixels. */
  readonly moduleWidth = input(0.75);

  /** Number of quiet-zone modules added to each side of the symbol. */
  private readonly quietZone = 10;

  /**
   * The 108 Code 128 symbol patterns (indices 0–106 plus the stop bar). Each
   * string lists alternating bar/space widths in modules, starting with a bar.
   */
  private static readonly PATTERNS = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
  ];

  private static readonly START_B = 104;
  private static readonly STOP = 106;

  /** Code 128 symbol indices for the value, including start, checksum and stop. */
  private readonly codes = computed<number[]>(() => {
    const text = this.value() ?? '';
    const result: number[] = [Barcode.START_B];
    let checksum = Barcode.START_B;
    let position = 1;
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      // Subset B encodes ASCII 32–126 as value (code - 32).
      const valueCode = code >= 32 && code <= 126 ? code - 32 : 0;
      result.push(valueCode);
      checksum += valueCode * position;
      position++;
    }
    result.push(checksum % 103);
    result.push(Barcode.STOP);
    return result;
  });

  /** Total module count: quiet zones plus every symbol's bar/space widths. */
  protected readonly totalModules = computed(() => {
    let modules = this.quietZone * 2;
    for (const code of this.codes()) {
      for (const w of Barcode.PATTERNS[code]) modules += Number(w);
    }
    return modules;
  });

  protected readonly totalWidth = computed(() => this.totalModules() * this.moduleWidth());

  /** Dark bars laid out across the module grid, ready to render as rects. */
  protected readonly bars = computed<Bar[]>(() => {
    const codes = this.codes();
    if (codes.length <= 2) return [];

    const mw = this.moduleWidth();
    const bars: Bar[] = [];
    let cursor = this.quietZone; // modules from the left edge

    for (const code of codes) {
      const pattern = Barcode.PATTERNS[code];
      for (let i = 0; i < pattern.length; i++) {
        const widthModules = Number(pattern[i]);
        // Even indices are bars, odd indices are spaces.
        if (i % 2 === 0) {
          bars.push({ x: cursor * mw, width: widthModules * mw });
        }
        cursor += widthModules;
      }
    }
    return bars;
  });
}
