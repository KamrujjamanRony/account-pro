import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../config/theme';
import { Button } from './Button';
import { EmptyState, T } from './layout';

interface ScreenProps {
  children: React.ReactNode;
  /** Shows a full-screen spinner. */
  loading?: boolean;
  /** Shows an error state with a retry button. */
  error?: string | null;
  onRetry?: () => void;
  /** Enables pull-to-refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
  padded?: boolean;
}

/** Themed page container with loading / error / refresh handling. */
export function Screen({
  children,
  loading,
  error,
  onRetry,
  onRefresh,
  refreshing,
  scroll = true,
  padded = true,
}: ScreenProps) {
  const { palette } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={palette.primary} />
        <T muted style={{ marginTop: spacing.md }}>
          Loading…
        </T>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <EmptyState title="Couldn't load data" message={error} />
        {onRetry ? <Button label="Try again" onPress={onRetry} variant="secondary" /> : null}
      </View>
    );
  }

  const inner = <View style={{ padding: padded ? spacing.lg : 0, flexGrow: 1 }}>{children}</View>;

  if (!scroll) {
    return <View style={{ flex: 1, backgroundColor: palette.bg }}>{inner}</View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={palette.primary} /> : undefined
      }
    >
      {inner}
    </ScrollView>
  );
}
