import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radius, spacing } from '../../config/theme';

/** A themed surface card. */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Primary / muted text helpers bound to the theme. */
export function T({
  children,
  style,
  muted,
  weight,
  size,
  color,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: TextStyle;
  muted?: boolean;
  weight?: TextStyle['fontWeight'];
  size?: number;
  color?: string;
  numberOfLines?: number;
}) {
  const { palette } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { color: color ?? (muted ? palette.textMuted : palette.text), fontSize: size ?? 14, fontWeight: weight },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** A small pill badge (status, tags). */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'danger' | 'info' | 'warning' }) {
  const { palette } = useTheme();
  const map: Record<string, string> = {
    neutral: palette.textMuted,
    success: palette.success,
    danger: palette.danger,
    info: palette.info,
    warning: palette.warning,
  };
  const color = map[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: color + '22',
      }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Divider() {
  const { palette } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.border, marginVertical: spacing.sm }} />;
}

export function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
      <View style={{ flex: 1 }}>
        <T size={18} weight="800">
          {title}
        </T>
        {subtitle ? (
          <T muted size={13} style={{ marginTop: 2 }}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xl * 2 }}>
      <T size={16} weight="700">
        {title}
      </T>
      {message ? (
        <T muted size={13} style={{ marginTop: spacing.xs, textAlign: 'center' }}>
          {message}
        </T>
      ) : null}
    </View>
  );
}

/** A key/value row used in detail cards and report meta. */
export function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
      <T muted size={13}>
        {label}
      </T>
      {typeof value === 'string' || typeof value === 'number' ? (
        <T size={13} weight="600">
          {value}
        </T>
      ) : (
        value
      )}
    </View>
  );
}
