import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../config/theme';
import { T } from '../ui/layout';
import { money } from '../../lib/format';

/** Horizontal scroll wrapper so wide report tables never overflow the page. */
export function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: '100%' }}>
      <View>{children}</View>
    </ScrollView>
  );
}

type Align = 'left' | 'right' | 'center';

/** A single report table cell with fixed width and alignment. */
export function Cell({
  children,
  w,
  align = 'left',
  bold,
  muted,
  color,
  size = 12,
}: {
  children: React.ReactNode;
  w: number;
  align?: Align;
  bold?: boolean;
  muted?: boolean;
  color?: string;
  size?: number;
}) {
  return (
    <View style={{ width: w, paddingHorizontal: 6, paddingVertical: 6, justifyContent: 'center' }}>
      <T
        size={size}
        muted={muted}
        color={color}
        weight={bold ? '700' : '400'}
        style={{ textAlign: align }}
        numberOfLines={2}
      >
        {children}
      </T>
    </View>
  );
}

/** A money cell (blank on zero, Dr/Cr colouring optional). */
export function MoneyCell({ value, w, bold, side }: { value: number; w: number; bold?: boolean; side?: 'debit' | 'credit' }) {
  const { palette } = useTheme();
  const color = side === 'debit' ? palette.debit : side === 'credit' ? palette.credit : undefined;
  return (
    <Cell w={w} align="right" bold={bold} color={color}>
      {money(value, true)}
    </Cell>
  );
}

export function Row({
  children,
  header,
  highlight,
  top,
}: {
  children: React.ReactNode;
  header?: boolean;
  highlight?: boolean;
  top?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: header ? palette.surfaceAlt : highlight ? palette.primarySoft : 'transparent',
        borderTopWidth: top ? StyleSheet.hairlineWidth : 0,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
      }}
    >
      {children}
    </View>
  );
}

/** A left-aligned label spanning the row, used for section/group headings. */
export function BandRow({ label, tone }: { label: string; tone?: 'group' | 'section' }) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        paddingVertical: 6,
        paddingHorizontal: 6,
        backgroundColor: tone === 'section' ? palette.primarySoft : palette.surfaceAlt,
        marginTop: spacing.sm,
      }}
    >
      <T size={13} weight="800" color={tone === 'section' ? palette.primary : palette.text}>
        {label}
      </T>
    </View>
  );
}
