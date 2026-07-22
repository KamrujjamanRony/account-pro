import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { spacing } from '../../src/config/theme';
import { reportService } from '../../src/services/report';
import { TrialBalanceReport, TrialBalanceTotals } from '../../src/models/report';
import { startOfYearIso, todayIso, formatDate, money } from '../../src/lib/format';
import { errMessage, notify } from '../../src/lib/alerts';
import { printDocument, escapeHtml } from '../../src/lib/print';
import { Card, T, EmptyState } from '../../src/components/ui/layout';
import { DateRangeFilter } from '../../src/components/report/FilterBar';
import { Letterhead } from '../../src/components/report/Letterhead';
import { ReportActions } from '../../src/components/report/ReportActions';
import { HScroll, Row, Cell, MoneyCell, BandRow } from '../../src/components/report/table';

const LW = 150;
const MW = 78;

export default function TrialBalanceScreen() {
  const { palette } = useTheme();
  const [fromDate, setFromDate] = useState(startOfYearIso());
  const [toDate, setToDate] = useState(todayIso());
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      setReport(await reportService.trialBalance({ fromDate, toDate }));
    } catch (err) {
      notify('Error', errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const TotalsCells = ({ t, bold }: { t: TrialBalanceTotals; bold?: boolean }) => (
    <>
      <MoneyCell value={t.opening.debit} w={MW} bold={bold} />
      <MoneyCell value={t.opening.credit} w={MW} bold={bold} />
      <MoneyCell value={t.period.debit} w={MW} bold={bold} />
      <MoneyCell value={t.period.credit} w={MW} bold={bold} />
      <MoneyCell value={t.closing.debit} w={MW} bold={bold} />
      <MoneyCell value={t.closing.credit} w={MW} bold={bold} />
    </>
  );

  const buildHtml = (): string => {
    if (!report) return '';
    const cells = (t: TrialBalanceTotals) =>
      [t.opening.debit, t.opening.credit, t.period.debit, t.period.credit, t.closing.debit, t.closing.credit]
        .map((n) => `<td class="r">${n ? money(n) : ''}</td>`)
        .join('');
    let rows = '';
    for (const s of report.sections) {
      rows += `<tr class="band"><td colspan="7">${escapeHtml(s.nature)}</td></tr>`;
      for (const g of s.groups) {
        rows += `<tr><td colspan="7" class="muted">${escapeHtml(g.groupName)}</td></tr>`;
        for (const l of g.lines) rows += `<tr><td>${escapeHtml(l.ledgerName)}</td>${cells(l)}</tr>`;
        rows += `<tr class="b"><td class="r">Sub Total</td>${cells(g.subTotal)}</tr>`;
      }
      rows += `<tr class="b"><td class="r">Summary — ${escapeHtml(s.nature)}</td>${cells(s.total)}</tr>`;
    }
    const body = `
      <h1>${escapeHtml(report.companyName)}</h1><div class="title">${escapeHtml(report.title)}</div>
      <div class="range">${escapeHtml(formatDate(report.fromDate))} to ${escapeHtml(formatDate(report.toDate))}</div>
      <table><thead>
        <tr><th rowspan="2">Ledger</th><th colspan="2" class="c">Opening</th><th colspan="2" class="c">Current</th><th colspan="2" class="c">Closing</th></tr>
        <tr><th class="r">Dr</th><th class="r">Cr</th><th class="r">Dr</th><th class="r">Cr</th><th class="r">Dr</th><th class="r">Cr</th></tr>
      </thead><tbody>${rows}</tbody>
      <tfoot><tr><td class="r">Grand Total</td>${cells(report.grandTotal)}</tr></tfoot></table>`;
    return printDocument(report.title, body);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.bg }} contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFrom={setFromDate} onTo={setToDate} onApply={run} loading={loading} />
      {report ? (
        <>
          <Card>
            <Letterhead companyName={report.companyName} title={report.title} fromDate={report.fromDate} toDate={report.toDate} />
            <HScroll>
              <Row header>
                <Cell w={LW} bold>
                  Ledger
                </Cell>
                <Cell w={MW} align="right" bold>
                  Op Dr
                </Cell>
                <Cell w={MW} align="right" bold>
                  Op Cr
                </Cell>
                <Cell w={MW} align="right" bold>
                  Cur Dr
                </Cell>
                <Cell w={MW} align="right" bold>
                  Cur Cr
                </Cell>
                <Cell w={MW} align="right" bold>
                  Cl Dr
                </Cell>
                <Cell w={MW} align="right" bold>
                  Cl Cr
                </Cell>
              </Row>
              {report.sections.map((s, si) => (
                <View key={si}>
                  <BandRow label={s.nature} tone="section" />
                  {s.groups.map((g, gi) => (
                    <View key={gi}>
                      <BandRow label={g.groupName} tone="group" />
                      {g.lines.map((l, li) => (
                        <Row key={li}>
                          <Cell w={LW}>{l.ledgerName}</Cell>
                          <TotalsCells t={l} />
                        </Row>
                      ))}
                      <Row>
                        <Cell w={LW} align="right" bold>
                          Sub Total
                        </Cell>
                        <TotalsCells t={g.subTotal} bold />
                      </Row>
                    </View>
                  ))}
                  <Row highlight>
                    <Cell w={LW} align="right" bold>
                      Summary — {s.nature}
                    </Cell>
                    <TotalsCells t={s.total} bold />
                  </Row>
                </View>
              ))}
              <Row highlight>
                <Cell w={LW} align="right" bold>
                  Grand Total
                </Cell>
                <TotalsCells t={report.grandTotal} bold />
              </Row>
            </HScroll>
          </Card>
          <ReportActions buildHtml={buildHtml} />
        </>
      ) : (
        <View style={{ marginTop: spacing.xl }}>{!loading ? <EmptyState title="Trial Balance" message="Choose a date range and generate the report." /> : null}</View>
      )}
    </ScrollView>
  );
}
