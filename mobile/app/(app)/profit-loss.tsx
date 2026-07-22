import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { spacing } from '../../src/config/theme';
import { reportService } from '../../src/services/report';
import { ProfitLossReport, ProfitLossRow, ProfitLossLevel } from '../../src/models/report';
import { startOfYearIso, todayIso, formatDate, money } from '../../src/lib/format';
import { errMessage, notify } from '../../src/lib/alerts';
import { printDocument, escapeHtml } from '../../src/lib/print';
import { Card, T, EmptyState } from '../../src/components/ui/layout';
import { DateRangeFilter } from '../../src/components/report/FilterBar';
import { Letterhead } from '../../src/components/report/Letterhead';
import { ReportActions } from '../../src/components/report/ReportActions';
import { HScroll, Row, Cell, MoneyCell } from '../../src/components/report/table';
import { Select } from '../../src/components/ui/form';

const LW = 200;
const MW = 100;

export default function ProfitLossScreen() {
  const { palette } = useTheme();
  const [fromDate, setFromDate] = useState(startOfYearIso());
  const [toDate, setToDate] = useState(todayIso());
  const [level, setLevel] = useState<ProfitLossLevel>('Group');
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      setReport(await reportService.profitLoss({ fromDate, toDate, level }));
    } catch (err) {
      notify('Error', errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const emphasise = (kind: ProfitLossRow['kind']) => kind === 'section' || kind === 'subtotal' || kind === 'summary' || kind === 'net';

  const buildHtml = (): string => {
    if (!report) return '';
    const rows = report.rows
      .map((r) => {
        const pad = 6 + r.level * 16;
        const cls = emphasise(r.kind) ? 'b' : '';
        return `<tr class="${cls}"><td style="padding-left:${pad}px">${escapeHtml(r.label)}</td><td class="r">${r.uptoPrevious ? money(r.uptoPrevious) : ''}</td><td class="r">${
          r.currentPeriod ? money(r.currentPeriod) : ''
        }</td><td class="r">${r.amount ? money(r.amount) : ''}</td></tr>`;
      })
      .join('');
    const body = `
      <h1>${escapeHtml(report.companyName)}</h1><div class="title">${escapeHtml(report.title)}</div>
      <div class="range">${escapeHtml(formatDate(report.fromDate))} to ${escapeHtml(formatDate(report.toDate))}</div>
      <table><thead><tr><th>Particulars</th><th class="r">Upto Previous</th><th class="r">Current Period</th><th class="r">Amount</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
    return printDocument(report.title, body);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.bg }} contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFrom={setFromDate} onTo={setToDate} onApply={run} loading={loading}>
        <Select
          label="Detail Level"
          value={level}
          options={[
            { label: 'Group', value: 'Group' },
            { label: 'Ledger', value: 'Ledger' },
          ]}
          onChange={(v) => setLevel(v as ProfitLossLevel)}
        />
      </DateRangeFilter>
      {report ? (
        <>
          <Card>
            <Letterhead companyName={report.companyName} title={report.title} fromDate={report.fromDate} toDate={report.toDate} />
            <HScroll>
              <Row header>
                <Cell w={LW} bold>
                  Particulars
                </Cell>
                <Cell w={MW} align="right" bold>
                  Upto Prev.
                </Cell>
                <Cell w={MW} align="right" bold>
                  Current
                </Cell>
                <Cell w={MW} align="right" bold>
                  Amount
                </Cell>
              </Row>
              {report.rows.map((r, i) => {
                const strong = emphasise(r.kind);
                return (
                  <Row key={i} header={r.kind === 'section'} highlight={r.kind === 'net'}>
                    <View style={{ width: LW, paddingLeft: 6 + r.level * 14, paddingVertical: 6, justifyContent: 'center' }}>
                      <T size={12} weight={strong ? '800' : '400'} color={r.kind === 'net' ? palette.primary : undefined}>
                        {r.label}
                      </T>
                    </View>
                    <MoneyCell value={r.uptoPrevious} w={MW} bold={strong} />
                    <MoneyCell value={r.currentPeriod} w={MW} bold={strong} />
                    <MoneyCell value={r.amount} w={MW} bold={strong} />
                  </Row>
                );
              })}
            </HScroll>
          </Card>
          <ReportActions buildHtml={buildHtml} />
        </>
      ) : (
        <View style={{ marginTop: spacing.xl }}>{!loading ? <EmptyState title="Profit & Loss" message="Choose a date range and generate the report." /> : null}</View>
      )}
    </ScrollView>
  );
}
