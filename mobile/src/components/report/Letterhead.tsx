import React from 'react';
import { View } from 'react-native';
import { environment } from '../../config/env';
import { spacing } from '../../config/theme';
import { T } from '../ui/layout';
import { formatDate } from '../../lib/format';

/** Printed-report letterhead: company name / address / report title / range. */
export function Letterhead({
  companyName,
  title,
  fromDate,
  toDate,
  asOfDate,
  extra,
}: {
  companyName?: string;
  title: string;
  fromDate?: string;
  toDate?: string;
  asOfDate?: string;
  extra?: string;
}) {
  return (
    <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
      <T size={18} weight="800">
        {companyName ?? environment.companyName}
      </T>
      <T muted size={12}>
        {environment.companyAddress}
      </T>
      <T size={15} weight="700" style={{ marginTop: spacing.sm }}>
        {title}
      </T>
      {asOfDate ? (
        <T muted size={12} style={{ marginTop: 2 }}>
          As on {formatDate(asOfDate)}
        </T>
      ) : fromDate && toDate ? (
        <T muted size={12} style={{ marginTop: 2 }}>
          {formatDate(fromDate)} to {formatDate(toDate)}
        </T>
      ) : null}
      {extra ? (
        <T muted size={12} style={{ marginTop: 2 }}>
          {extra}
        </T>
      ) : null}
    </View>
  );
}
