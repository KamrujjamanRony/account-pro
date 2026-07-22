import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import { environment } from '../src/config/env';
import { spacing } from '../src/config/theme';
import { voucherService } from '../src/services/voucher';
import { ledgerService } from '../src/services/ledger';
import { Voucher, VOUCHER_TYPES } from '../src/models/voucher';
import { errMessage, notify } from '../src/lib/alerts';
import { money, formatDate } from '../src/lib/format';
import { printDocument, printHtml, sharePdf, escapeHtml } from '../src/lib/print';
import { Card, T, Divider, KeyValue } from '../src/components/ui/layout';
import { Button } from '../src/components/ui/Button';
import { HScroll, Row, Cell, MoneyCell } from '../src/components/report/table';
import { Barcode } from '../src/components/Barcode';

export default function VoucherPrint() {
  const { palette } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [names, setNames] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [full, ledgers] = await Promise.all([
          voucherService.getById(Number(id)),
          ledgerService.searchList({}),
        ]);
        setVoucher(full);
        const map = new Map<number, string>();
        for (const l of ledgers.items) if (l.id != null) map.set(l.id, l.ledgerName);
        setNames(map);
      } catch (err) {
        notify('Error', errMessage(err, 'Failed to load voucher.'));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const typeLabel = (code: string) => VOUCHER_TYPES.find((t) => t.code === code)?.label ?? code;
  const ledgerName = (lid: number) => names.get(lid) ?? `#${lid}`;

  const totals = useMemo(() => {
    const d = (voucher?.details ?? []).reduce((s, x) => s + (Number(x.debit) || 0), 0);
    const c = (voucher?.details ?? []).reduce((s, x) => s + (Number(x.credit) || 0), 0);
    return { debit: d, credit: c };
  }, [voucher]);

  const buildHtml = (): string => {
    if (!voucher) return '';
    const rows = (voucher.details ?? [])
      .map(
        (d) =>
          `<tr><td>${escapeHtml(ledgerName(d.ledgerId))}</td><td class="r">${d.debit ? money(d.debit) : ''}</td><td class="r">${
            d.credit ? money(d.credit) : ''
          }</td><td>${escapeHtml(d.remarks ?? '')}</td></tr>`,
      )
      .join('');
    const body = `
      <h1>${escapeHtml(environment.companyName)}</h1>
      <div class="addr">${escapeHtml(environment.companyAddress)}</div>
      <div class="title">${escapeHtml(typeLabel(voucher.type))} Voucher</div>
      <table style="margin:8px 0; border:none;"><tr style="border:none;">
        <td style="border:none;"><b>No:</b> ${escapeHtml(voucher.voucherNo ?? '')}</td>
        <td style="border:none;"><b>Date:</b> ${escapeHtml(formatDate(voucher.voucherDate))}</td>
        <td style="border:none;"><b>Ref:</b> ${escapeHtml(voucher.reference ?? 'N/A')}</td>
      </tr></table>
      <table>
        <thead><tr><th>Ledger</th><th class="r">Debit</th><th class="r">Credit</th><th>Remarks</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td class="r">Total</td><td class="r">${money(totals.debit)}</td><td class="r">${money(totals.credit)}</td><td></td></tr></tfoot>
      </table>
      <p><b>Narration:</b> ${escapeHtml(voucher.narration ?? '')}</p>
      <div style="margin-top:40px; display:flex; justify-content:space-between;">
        <span>_______________<br/>Prepared By</span>
        <span>_______________<br/>Checked By</span>
        <span>_______________<br/>Authorised</span>
      </div>`;
    return printDocument(`Voucher ${voucher.voucherNo ?? ''}`, body);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
        <T muted>Loading…</T>
      </View>
    );
  }
  if (!voucher) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
        <T muted>Voucher not found.</T>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Voucher ${voucher.voucherNo ?? ''}` }} />
      <ScrollView style={{ flex: 1, backgroundColor: palette.bg }} contentContainerStyle={{ padding: spacing.lg }}>
        <Card>
          <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
            <T size={18} weight="800">
              {environment.companyName}
            </T>
            <T muted size={12}>
              {environment.companyAddress}
            </T>
            <T size={15} weight="700" style={{ marginTop: spacing.sm }}>
              {typeLabel(voucher.type)} Voucher
            </T>
          </View>

          <KeyValue label="Voucher No" value={voucher.voucherNo ?? '—'} />
          <KeyValue label="Date" value={formatDate(voucher.voucherDate)} />
          <KeyValue label="Reference" value={voucher.reference || 'N/A'} />
          {voucher.costCenter ? <KeyValue label="Cost Center" value={voucher.costCenter} /> : null}
          <Divider />

          <HScroll>
            <Row header>
              <Cell w={140} bold>
                Ledger
              </Cell>
              <Cell w={90} align="right" bold>
                Debit
              </Cell>
              <Cell w={90} align="right" bold>
                Credit
              </Cell>
              <Cell w={120} bold>
                Remarks
              </Cell>
            </Row>
            {(voucher.details ?? []).map((d, i) => (
              <Row key={i}>
                <Cell w={140}>{ledgerName(d.ledgerId)}</Cell>
                <MoneyCell value={d.debit} w={90} side="debit" />
                <MoneyCell value={d.credit} w={90} side="credit" />
                <Cell w={120}>{d.remarks ?? ''}</Cell>
              </Row>
            ))}
            <Row highlight>
              <Cell w={140} bold align="right">
                Total
              </Cell>
              <MoneyCell value={totals.debit} w={90} bold />
              <MoneyCell value={totals.credit} w={90} bold />
              <Cell w={120}> </Cell>
            </Row>
          </HScroll>

          {voucher.narration ? (
            <T size={13} style={{ marginTop: spacing.md }}>
              <T size={13} weight="700">
                Narration:{' '}
              </T>
              {voucher.narration}
            </T>
          ) : null}

          <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
            <Barcode value={voucher.voucherNo ?? String(voucher.id ?? '')} />
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
          <Button label="Print" icon="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8Z" onPress={() => printHtml(buildHtml())} style={{ flex: 1 }} full />
          <Button label="Share PDF" variant="secondary" onPress={() => sharePdf(buildHtml())} style={{ flex: 1 }} full />
        </View>
      </ScrollView>
    </>
  );
}
