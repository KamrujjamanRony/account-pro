import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { T } from './ui/layout';

/**
 * A lightweight, deterministic barcode-style graphic for a voucher number.
 * This is a visual stand-in (not a scan-accurate Code128) drawn from a hash of
 * the value, matching the web app's decorative barcode on the voucher print.
 */
export function Barcode({ value, height = 48, showText = true }: { value: string; height?: number; showText?: boolean }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  const seed = value || '0';
  for (let i = 0; i < seed.length; i++) {
    const code = seed.charCodeAt(i);
    // Derive four bar/space widths per character from its code point.
    const widths = [((code >> 0) & 3) + 1, ((code >> 2) & 3) + 1, ((code >> 4) & 3) + 1, ((code >> 6) & 3) + 1];
    widths.forEach((w, idx) => {
      if (idx % 2 === 0) bars.push({ x, w });
      x += w;
    });
  }
  const totalWidth = Math.max(x, 1);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={Math.min(totalWidth * 2, 260)} height={height} viewBox={`0 0 ${totalWidth} ${height}`} preserveAspectRatio="none">
        {bars.map((b, i) => (
          <Rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#000" />
        ))}
      </Svg>
      {showText ? (
        <T size={12} weight="700" style={{ letterSpacing: 2, marginTop: 4 }}>
          {value}
        </T>
      ) : null}
    </View>
  );
}
