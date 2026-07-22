import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { spacing } from '../../src/config/theme';
import { reportService } from '../../src/services/report';
import { GeneralLedgerReport } from '../../src/models/report';
import { startOfYearIso, todayIso, formatDate, money } from '../../src/lib/format';
import { errMessage, notify } from '../../src/lib/alerts';
import { printDocument, escapeHtml } from '../../src/lib/print';
import { Card, T, EmptyState } from '../../src/components/ui/layout';
import { DateRangeFilter } from '../../src/components/report/FilterBar';
import { Letterhead } from '../../src/components/report/Letterhead';
import { ReportActions } from '../../src/components/report/ReportActions';
import { HScroll, Row, Cell, MoneyCell, BandRow } from '../../src/components/report/table';

const W = { date: 76, vch: 66, narr: 150, dr: 92, cr: 92, bal: 104 };

export default function GeneralLedgerScreen() {
  const { palette } = useTheme();
  const [fromDate, setFromDate] = useState(startOfYearIso());
  const [toDate, setToDate] = useState(todayIso());
  const [report, setReport] = useState<GeneralLedgerReport | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      setReport(await reportService.generalLedger({ fromDate, toDate }));
    } catch (err) {
      notify('Error', errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const buildHtml = (): string => {
    if (!report) return '';
    let rows = '';
    for (const g of report.groups) {
      rows += `<tr class="band"><td colspan="6">${escapeHtml(g.groupName)}</td></tr>`;
      for (const a of g.accounts) {
        rows += `<tr><td colspan="6" class="muted">${escapeHtml(a.ledgerName)}</td></tr>`;
        for (const l of a.lines)
          rows += `<tr><td>${escapeHtml(l.isOpening ? '' : formatDate(l.date))}</td><td>${escapeHtml(l.voucherNo)}</td><td>${escapeHtml(
            l.narration,
          )}</td><td class="r">${l.debit ? money(l.debit) : ''}</td><td class="r">${l.credit ? money(l.credit) : ''}</td><td class="r">${
            l.balance ? `${money(l.balance)} ${l.balanceSide}` : ''
          }</td></tr>`;
        if (a.hasSubTotal)
          rows += `<tr class="b"><td colspan="3" class="r">Sub Total</td><td class="r">${money(a.subTotalDebit)}</td><td class="r">${money(a.subTotalCredit)}</td><td></td></tr>`;
      }
      rows += `<tr class="b"><td colspan="3" class="r">Summary — ${escapeHtml(g.groupName)}</td><td class="r">${money(g.summaryDebit)}</td><td class="r">${money(
        g.summaryCredit,
      )}</td><td class="r">${money(g.closingBalance)} ${escapeHtml(g.closingSide)}</td></tr>`;
    }
    const body = `
      <h1>${escapeHtml(report.companyName)}</h1><div class="title">${escapeHtml(report.title)}</div>
      <div class="range">${escapeHtml(formatDate(report.fromDate))} to ${escapeHtml(formatDate(report.toDate))}</div>
      <table><thead><tr><th>Date</th><th>Vch</th><th>Narration</th><th class="r">Dr</th><th class="r">Cr</th><th class="r">Balance</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
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
                <Cell w={W.date} bold>
                  Date
                </Cell>
                <Cell w={W.vch} bold>
                  Vch
                </Cell>
                <Cell w={W.narr} bold>
                  Narration
                </Cell>
                <Cell w={W.dr} align="right" bold>
                  Dr
                </Cell>
                <Cell w={W.cr} align="right" bold>
                  Cr
                </Cell>
                <Cell w={W.bal} align="right" bold>
                  Balance
                </Cell>
              </Row>
              {report.groups.map((g, gi) => (
                <View key={gi}>
                  <BandRow label={g.groupName} tone="section" />
                  {g.accounts.map((a, ai) => (
                    <View key={ai}>
                      <BandRow label={a.ledgerName} tone="group" />
                      {a.lines.map((l, li) => (
                        <Row key={li}>
                          <Cell w={W.date}>{l.isOpening ? '' : formatDate(l.date)}</Cell>
                          <Cell w={W.vch}>{l.voucherNo}</Cell>
                          <Cell w={W.narr}>{l.narration}</Cell>
                          <MoneyCell value={l.debit} w={W.dr} side="debit" />
                          <MoneyCell value={l.credit} w={W.cr} side="credit" />
                          <Cell w={W.bal} align="right">
                            {l.balance ? `${money(l.balance)} ${l.balanceSide}` : ''}
                          </Cell>
                        </Row>
                      ))}
                      {a.hasSubTotal ? (
                        <Row>
                          <Cell w={W.date + W.vch + W.narr} align="right" bold>
                            Sub Total
                          </Cell>
                          <MoneyCell value={a.subTotalDebit} w={W.dr} bold />
                          <MoneyCell value={a.subTotalCredit} w={W.cr} bold />
                          <Cell w={W.bal}> </Cell>
                        </Row>
                      ) : null}
                    </View>
                  ))}
                  <Row highlight>
                    <Cell w={W.date + W.vch + W.narr} align="right" bold>
                      Summary — {g.groupName}
                    </Cell>
                    <MoneyCell value={g.summaryDebit} w={W.dr} bold />
                    <MoneyCell value={g.summaryCredit} w={W.cr} bold />
                    <Cell w={W.bal} align="right" bold>
                      {money(g.closingBalance)} {g.closingSide}
                    </Cell>
                  </Row>
                </View>
              ))}
            </HScroll>
          </Card>
          <ReportActions buildHtml={buildHtml} />
        </>
      ) : (
        <View style={{ marginTop: spacing.xl }}>{!loading ? <EmptyState title="General Ledger" message="Choose a date range and generate the report." /> : null}</View>
      )}
    </ScrollView>
  );
}
