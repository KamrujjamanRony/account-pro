import React from 'react';
import { View } from 'react-native';
import { spacing } from '../../config/theme';
import { Button } from '../ui/Button';
import { printHtml, sharePdf } from '../../lib/print';
import { errMessage, notify } from '../../lib/alerts';

/** Print / Share-PDF buttons for a rendered report. */
export function ReportActions({ buildHtml }: { buildHtml: () => string }) {
  const guard = (fn: (html: string) => Promise<void>) => async () => {
    try {
      const html = buildHtml();
      if (!html) return;
      await fn(html);
    } catch (err) {
      notify('Print failed', errMessage(err));
    }
  };
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
      <Button
        label="Print"
        icon="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8Z"
        onPress={guard(printHtml)}
        style={{ flex: 1 }}
        full
      />
      <Button label="Share PDF" variant="secondary" onPress={guard(sharePdf)} style={{ flex: 1 }} full />
    </View>
  );
}
