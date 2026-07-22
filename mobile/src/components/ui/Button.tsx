import React from 'react';
import { ActivityIndicator, Pressable, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radius, spacing } from '../../config/theme';
import { Icon } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  full?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  style,
  full,
}: ButtonProps) {
  const { palette } = useTheme();

  const bg: Record<Variant, string> = {
    primary: palette.primary,
    secondary: palette.surfaceAlt,
    ghost: 'transparent',
    danger: palette.danger,
  };
  const fg: Record<Variant, string> = {
    primary: palette.onPrimary,
    secondary: palette.text,
    ghost: palette.primary,
    danger: '#fff',
  };
  const border = variant === 'secondary' ? palette.border : 'transparent';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          backgroundColor: bg[variant],
          borderColor: border,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderRadius: radius.md,
          paddingVertical: size === 'sm' ? 8 : 13,
          paddingHorizontal: size === 'sm' ? 12 : 18,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg[variant]} />
      ) : (
        <>
          {icon ? (
            <View>
              <Icon path={icon} size={size === 'sm' ? 16 : 18} color={fg[variant]} />
            </View>
          ) : null}
          <Text style={{ color: fg[variant], fontWeight: '700', fontSize: size === 'sm' ? 13 : 15 }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
