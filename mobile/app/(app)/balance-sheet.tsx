import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { spacing } from '../../src/config/theme';
import { reportService } from '../../src/services/report';
import { BalanceSheetReport, BalanceSheetSide } from '../../src/models/report';
import { startOfYearIso, todayIso, formatDate, money } from '../../src/lib/format';
import { errMessage, notify } from '../../src/lib/alerts';
import { printDocument, escapeHtml } from '../../src/lib/print';
import { Card, T, Badge, EmptyState } from '../../src/components/ui/layout';
import { Button } from '../../src/components/ui/Button';
import { DateField, SwitchField } from '../../src/components/ui/form';
import { Letterhead } from '../../src/components/report/Letterhead';
import { ReportActions } from '../../src/components/report/ReportActions';
import { HScroll, Row, Cell, MoneyCell, BandRow } from '../../src/components/report/table';

const NW = 200;
const AW = 120;

export default function BalanceSheetScreen() {
  const { palette } = useTheme();
  const [asOfDate, setAsOfDate] = useState(todayIso());
  const [fiscalYearStart, setFiscalYearStart] = useState(startOfYearIso());
  const [detail, setDetail] = useState(false);
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      setReport(await reportService.balanceSheet({ asOfDate, fiscalYearStart }));
    } catch (err) {
      notify('Error', errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const renderSide = (side: BalanceSheetSide) => (
    <View>
      <BandRow label={side.title} tone="section" />
      {side.sections.map((sec, si) => (
        <View key={si}>
          {sec.sectionName && sec.sectionName !== side.title ? <BandRow label={sec.sectionName} tone="group" /> : null}
          {sec.groups.map((g, gi) => (
            <View key={gi}>
              <Row>
                <Cell w={NW} bold>
                  {g.groupName}
                </Cell>
                <MoneyCell value={g.amount} w={AW} bold />
              </Row>
              {detail
                ? g.ledgers.map((l, li) => (
                    <Row key={li}>
                      <Cell w={NW}> · {l.name}</Cell>
                      <MoneyCell value={l.amount} w={AW} />
                    </Row>
                  ))
                : null}
            </View>
          ))}
          <Row>
            <Cell w={NW} align="right" bold>
              Sub Total
            </Cell>
            <MoneyCell value={sec.subTotal} w={AW} bold />
          </Row>
        </View>
      ))}
      <Row highlight>
        <Cell w={NW} align="right" bold>
          Total {side.title}
        </Cell>
        <MoneyCell value={side.summary} w={AW} bold />
      </Row>
    </View>
  );

  const buildHtml = (): string => {
    if (!report) return '';
    const side = (s: BalanceSheetSide) => {
      let out = `<tr class="band"><td colspan="2">${escapeHtml(s.title)}</td></tr>`;
      for (const sec of s.sections) {
        if (sec.sectionName && sec.sectionName !== s.title) out += `<tr><td colspan="2" class="muted">${escapeHtml(sec.sectionName)}</td></tr>`;
        for (const g of sec.groups) {
          out += `<tr><td class="b">${escapeHtml(g.groupName)}</td><td class="r b">${money(g.amount)}</td></tr>`;
          if (detail) for (const l of g.ledgers) out += `<tr><td> · ${escapeHtml(l.name)}</td><td class="r">${money(l.amount)}</td></tr>`;
        }
        out += `<tr class="b"><td class="r">Sub Total</td><td class="r">${money(sec.subTotal)}</td></tr>`;
      }
      out += `<tr class="b"><td class="r">Total ${escapeHtml(s.title)}</td><td class="r">${money(s.summary)}</td></tr>`;
      return out;
    };
    const body = `
      <h1>${escapeHtml(report.companyName)}</h1><div class="title">${escapeHtml(report.title)}</div>
      <div class="range">As on ${escapeHtml(formatDate(report.asOfDate))}</div>
      <table><thead><tr><th>Particulars</th><th class="r">Amount</th></tr></thead>
      <tbody>${side(report.assets)}${side(report.liabilities)}</tbody></table>
      <p class="${report.isBalanced ? '' : 'b'}">${report.isBalanced ? 'Balanced' : `Difference: ${money(report.difference)}`}</p>`;
    return printDocument(report.title, body);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.bg }} contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <DateField label="As on" value={asOfDate} onChange={setAsOfDate} />
          </View>
          <View style={{ flex: 1 }}>
            <DateField label="Fiscal Year Start" value={fiscalYearStart} onChange={setFiscalYearStart} />
          </View>
        </View>
        <SwitchField label="Show ledger detail" value={detail} onValueChange={setDetail} />
        <Button label="Generate report" icon="M5 13l4 4L19 7" onPress={run} loading={loading} full />
      </Card>

      {report ? (
        <>
          <Card>
            <Letterhead companyName={report.companyName} title={report.title} asOfDate={report.asOfDate} />
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.sm }}>
              <Badge label={report.isBalanced ? 'Balanced' : `Difference ${money(report.difference)}`} tone={report.isBalanced ? 'success' : 'danger'} />
            </View>
            <HScroll>
              <Row header>
                <Cell w={NW} bold>
                  Particulars
                </Cell>
                <Cell w={AW} align="right" bold>
                  Amount
                </Cell>
              </Row>
              {renderSide(report.assets)}
              {renderSide(report.liabilities)}
            </HScroll>
          </Card>
          <ReportActions buildHtml={buildHtml} />
        </>
      ) : (
        <View style={{ marginTop: spacing.xl }}>{!loading ? <EmptyState title="Balance Sheet" message="Choose the dates and generate the report." /> : null}</View>
      )}
    </ScrollView>
  );
}
