import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../config/theme';
import { T } from './ui/layout';
import { compactMoney } from '../lib/format';

export interface Slice {
  label: string;
  value: number;
  color: string;
}

/** A donut chart with a centre total and a legend, drawn with SVG arcs. */
export function Donut({ data, centerLabel }: { data: Slice[]; centerLabel?: string }) {
  const { palette } = useTheme();
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const total = data.reduce((sum, s) => sum + s.value, 0);

  let acc = 0;
  const arcs = data.map((s) => {
    const frac = total > 0 ? s.value / total : 0;
    const len = frac * circumference;
    const arc = { ...s, dash: `${len} ${circumference - len}`, offset: -acc, percent: Math.round(frac * 100) };
    acc += len;
    return arc;
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
      <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={140} height={140} viewBox="0 0 140 140">
          <Circle cx={70} cy={70} r={r} stroke={palette.border} strokeWidth={16} fill="none" />
          {arcs.map((a, i) => (
            <Circle
              key={i}
              cx={70}
              cy={70}
              r={r}
              stroke={a.color}
              strokeWidth={16}
              fill="none"
              strokeDasharray={a.dash}
              strokeDashoffset={a.offset}
              strokeLinecap="butt"
              transform="rotate(-90 70 70)"
            />
          ))}
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <T size={16} weight="800">
            {compactMoney(total)}
          </T>
          {centerLabel ? (
            <T muted size={11}>
              {centerLabel}
            </T>
          ) : null}
        </View>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        {arcs.map((a, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: a.color }} />
            <T size={12} style={{ flex: 1 }}>
              {a.label}
            </T>
            <T size={12} weight="700">
              {a.percent}%
            </T>
          </View>
        ))}
        {arcs.length === 0 ? <T muted size={12}>No data.</T> : null}
      </View>
    </View>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  color: string;
}

/** A horizontal comparison bar list. */
export function BarList({ data }: { data: BarDatum[] }) {
  const { palette } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ gap: spacing.md }}>
      {data.map((d, i) => (
        <View key={i} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size={12}>{d.label}</T>
            <T size={12} weight="700">
              {compactMoney(d.value)}
            </T>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.surfaceAlt, overflow: 'hidden' }}>
            <View style={{ height: 8, borderRadius: 4, width: `${(d.value / max) * 100}%`, backgroundColor: d.color }} />
          </View>
        </View>
      ))}
      {data.length === 0 ? <T muted size={12}>No data.</T> : null}
    </View>
  );
}
