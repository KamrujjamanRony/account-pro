import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { spacing } from '../../src/config/theme';
import { reportService } from '../../src/services/report';
import { DayBookReport } from '../../src/models/report';
import { VOUCHER_TYPES } from '../../src/models/voucher';
import { startOfYearIso, todayIso, formatDate, money } from '../../src/lib/format';
import { errMessage, notify } from '../../src/lib/alerts';
import { printDocument, escapeHtml } from '../../src/lib/print';
import { Card, T, Divider, EmptyState } from '../../src/components/ui/layout';
import { DateRangeFilter } from '../../src/components/report/FilterBar';
import { Letterhead } from '../../src/components/report/Letterhead';
import { ReportActions } from '../../src/components/report/ReportActions';
import { HScroll, Row, Cell, MoneyCell } from '../../src/components/report/table';
import { Select } from '../../src/components/ui/form';

const W = { group: 120, ledger: 140, dr: 92, cr: 92 };

export default function DayBookScreen() {
  const { palette } = useTheme();
  const [fromDate, setFromDate] = useState(startOfYearIso());
  const [toDate, setToDate] = useState(todayIso());
  const [type, setType] = useState('');
  const [report, setReport] = useState<DayBookReport | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      setReport(await reportService.dayBook({ fromDate, toDate, type: type || null }));
    } catch (err) {
      notify('Error', errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const buildHtml = (): string => {
    if (!report) return '';
    let rows = '';
    for (const s of report.sections) {
      rows += `<tr class="band"><td colspan="4">${escapeHtml(s.sectionName)}</td></tr>`;
      for (const v of s.vouchers) {
        rows += `<tr><td colspan="4" class="muted">ID: ${escapeHtml(v.voucherId)} · ${escapeHtml(formatDate(v.date))} · ${escapeHtml(v.type)} · Ref: ${escapeHtml(
          v.reference,
        )}</td></tr>`;
        for (const d of v.details)
          rows += `<tr><td>${escapeHtml(d.groupName)}</td><td>${escapeHtml(d.ledgerName)}</td><td class="r">${d.debit ? money(d.debit) : ''}</td><td class="r">${
            d.credit ? money(d.credit) : ''
          }</td></tr>`;
        rows += `<tr class="b"><td colspan="2" class="r">Sub Total</td><td class="r">${money(v.subTotalDebit)}</td><td class="r">${money(v.subTotalCredit)}</td></tr>`;
        if (v.narration) rows += `<tr><td colspan="4">Narration: ${escapeHtml(v.narration)}</td></tr>`;
      }
      rows += `<tr class="b"><td colspan="2" class="r">Summary — ${escapeHtml(s.sectionName)}</td><td class="r">${money(s.summaryDebit)}</td><td class="r">${money(
        s.summaryCredit,
      )}</td></tr>`;
    }
    const body = `
      <h1>${escapeHtml(report.companyName)}</h1><div class="title">${escapeHtml(report.title)}</div>
      <div class="range">${escapeHtml(formatDate(report.fromDate))} to ${escapeHtml(formatDate(report.toDate))}</div>
      <table><thead><tr><th>Group</th><th>Ledger</th><th class="r">Dr</th><th class="r">Cr</th></tr></thead><tbody>${rows}</tbody></table>`;
    return printDocument(report.title, body);
  };

  const typeOptions = [{ label: 'All types', value: '' }, ...VOUCHER_TYPES.map((t) => ({ label: `${t.code} — ${t.label}`, value: t.code }))];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.bg }} contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFrom={setFromDate} onTo={setToDate} onApply={run} loading={loading}>
        <Select label="Type" value={type} options={typeOptions} onChange={setType} />
      </DateRangeFilter>
      {report ? (
        <>
          <Card>
            <Letterhead companyName={report.companyName} title={report.title} fromDate={report.fromDate} toDate={report.toDate} />
            {report.sections.map((s, si) => (
              <View key={si} style={{ marginBottom: spacing.md }}>
                <T size={15} weight="800" color={palette.primary} style={{ marginBottom: spacing.sm }}>
                  {s.sectionName}
                </T>
                {s.vouchers.map((v, vi) => (
                  <View key={vi} style={{ marginBottom: spacing.md }}>
                    <View style={{ backgroundColor: palette.surfaceAlt, padding: spacing.sm, borderRadius: 6 }}>
                      <T size={12} weight="700">
                        ID: {v.voucherId} · {formatDate(v.date)}
                      </T>
                      <T muted size={11}>
                        {v.type} · Ref: {v.reference}
                        {v.costCenter ? ` · CC: ${v.costCenter}` : ''}
                      </T>
                    </View>
                    <HScroll>
                      <Row header>
                        <Cell w={W.group} bold>
                          Group
                        </Cell>
                        <Cell w={W.ledger} bold>
                          Ledger
                        </Cell>
                        <Cell w={W.dr} align="right" bold>
                          Dr
                        </Cell>
                        <Cell w={W.cr} align="right" bold>
                          Cr
                        </Cell>
                      </Row>
                      {v.details.map((d, di) => (
                        <Row key={di}>
                          <Cell w={W.group}>{d.groupName}</Cell>
                          <Cell w={W.ledger}>{d.ledgerName}</Cell>
                          <MoneyCell value={d.debit} w={W.dr} side="debit" />
                          <MoneyCell value={d.credit} w={W.cr} side="credit" />
                        </Row>
                      ))}
                      <Row highlight>
                        <Cell w={W.group + W.ledger} align="right" bold>
                          Sub Total
                        </Cell>
                        <MoneyCell value={v.subTotalDebit} w={W.dr} bold />
                        <MoneyCell value={v.subTotalCredit} w={W.cr} bold />
                      </Row>
                    </HScroll>
                    {v.narration ? (
                      <T muted size={11} style={{ marginTop: 4 }}>
                        Narration: {v.narration}
                      </T>
                    ) : null}
                  </View>
                ))}
                <Divider />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T weight="800">Summary — {s.sectionName}</T>
                  <T weight="800">
                    Dr {money(s.summaryDebit)} · Cr {money(s.summaryCredit)}
                  </T>
                </View>
              </View>
            ))}
          </Card>
          <ReportActions buildHtml={buildHtml} />
        </>
      ) : (
        <View style={{ marginTop: spacing.xl }}>{!loading ? <EmptyState title="Day Book" message="Choose a date range and generate the report." /> : null}</View>
      )}
    </ScrollView>
  );
}
