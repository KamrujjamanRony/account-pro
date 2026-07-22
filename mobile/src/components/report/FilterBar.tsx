import React from 'react';
import { View } from 'react-native';
import { spacing } from '../../config/theme';
import { Card } from '../ui/layout';
import { Button } from '../ui/Button';
import { DateField } from '../ui/form';

/** A date-range filter card used by the report screens. */
export function DateRangeFilter({
  fromDate,
  toDate,
  onFrom,
  onTo,
  onApply,
  loading,
  children,
}: {
  fromDate: string;
  toDate: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onApply: () => void;
  loading?: boolean;
  /** Extra filter controls (type / cost centre / level selectors). */
  children?: React.ReactNode;
}) {
  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <DateField label="From" value={fromDate} onChange={onFrom} />
        </View>
        <View style={{ flex: 1 }}>
          <DateField label="To" value={toDate} onChange={onTo} />
        </View>
      </View>
      {children}
      <Button label="Generate report" icon="M5 13l4 4L19 7" onPress={onApply} loading={loading} full />
    </Card>
  );
}
