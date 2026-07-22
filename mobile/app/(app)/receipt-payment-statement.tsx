import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { spacing } from '../../src/config/theme';
import { reportService } from '../../src/services/report';
import { ReceiptPaymentStatement, RpsSection } from '../../src/models/report';
import { startOfYearIso, todayIso, formatDate, money } from '../../src/lib/format';
import { errMessage, notify } from '../../src/lib/alerts';
import { printDocument, escapeHtml } from '../../src/lib/print';
import { Card, EmptyState } from '../../src/components/ui/layout';
import { DateRangeFilter } from '../../src/components/report/FilterBar';
import { Letterhead } from '../../src/components/report/Letterhead';
import { ReportActions } from '../../src/components/report/ReportActions';
import { HScroll, Row, Cell, MoneyCell, BandRow } from '../../src/components/report/table';

const LW = 190;
const MW = 100;

export default function ReceiptPaymentScreen() {
  const { palette } = useTheme();
  const [fromDate, setFromDate] = useState(startOfYearIso());
  const [toDate, setToDate] = useState(todayIso());
  const [report, setReport] = useState<ReceiptPaymentStatement | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      setReport(await reportService.receiptPaymentStatement({ fromDate, toDate }));
    } catch (err) {
      notify('Error', errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (section: RpsSection, key: string) => (
    <View key={key}>
      <BandRow label={section.sectionTitle} tone="section" />
      {section.groups.map((g, gi) => (
        <View key={gi}>
          <BandRow label={g.groupName} tone="group" />
          {g.lines.map((l, li) => (
            <Row key={li}>
              <Cell w={LW}>{l.ledger}</Cell>
              <MoneyCell value={l.receipt} w={MW} />
              <MoneyCell value={l.payment} w={MW} />
            </Row>
          ))}
          <Row>
            <Cell w={LW} align="right" bold>
              Sub Total
            </Cell>
            <MoneyCell value={g.subTotalReceipt} w={MW} bold />
            <MoneyCell value={g.subTotalPayment} w={MW} bold />
          </Row>
        </View>
      ))}
      <Row highlight>
        <Cell w={LW} align="right" bold>
          Summary
        </Cell>
        <MoneyCell value={section.summaryReceipt} w={MW} bold />
        <MoneyCell value={section.summaryPayment} w={MW} bold />
      </Row>
    </View>
  );

  const buildHtml = (): string => {
    if (!report) return '';
    const sec = (s: RpsSection) => {
      let out = `<tr class="band"><td colspan="3">${escapeHtml(s.sectionTitle)}</td></tr>`;
      for (const g of s.groups) {
        out += `<tr><td colspan="3" class="muted">${escapeHtml(g.groupName)}</td></tr>`;
        for (const l of g.lines) out += `<tr><td>${escapeHtml(l.ledger)}</td><td class="r">${l.receipt ? money(l.receipt) : ''}</td><td class="r">${l.payment ? money(l.payment) : ''}</td></tr>`;
        out += `<tr class="b"><td class="r">Sub Total</td><td class="r">${money(g.subTotalReceipt)}</td><td class="r">${money(g.subTotalPayment)}</td></tr>`;
      }
      out += `<tr class="b"><td class="r">Summary</td><td class="r">${money(s.summaryReceipt)}</td><td class="r">${money(s.summaryPayment)}</td></tr>`;
      return out;
    };
    const body = `
      <h1>${escapeHtml(report.companyName)}</h1><div class="title">${escapeHtml(report.title)}</div>
      <div class="range">${escapeHtml(formatDate(report.fromDate))} to ${escapeHtml(formatDate(report.toDate))}</div>
      <table><thead><tr><th>Ledger</th><th class="r">Receipt</th><th class="r">Payment</th></tr></thead>
      <tbody>${sec(report.openingCashBank)}${sec(report.receiptPayment)}${sec(report.closingCashBank)}</tbody>
      <tfoot><tr><td class="r">Grand Total</td><td class="r">${money(report.grandTotalReceipt)}</td><td class="r">${money(report.grandTotalPayment)}</td></tr></tfoot></table>`;
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
                  Receipt
                </Cell>
                <Cell w={MW} align="right" bold>
                  Payment
                </Cell>
              </Row>
              {renderSection(report.openingCashBank, 'open')}
              {renderSection(report.receiptPayment, 'rp')}
              {renderSection(report.closingCashBank, 'close')}
              <Row highlight>
                <Cell w={LW} align="right" bold>
                  Grand Total
                </Cell>
                <MoneyCell value={report.grandTotalReceipt} w={MW} bold />
                <MoneyCell value={report.grandTotalPayment} w={MW} bold />
              </Row>
            </HScroll>
          </Card>
          <ReportActions buildHtml={buildHtml} />
        </>
      ) : (
        <View style={{ marginTop: spacing.xl }}>{!loading ? <EmptyState title="Receipt & Payment" message="Choose a date range and generate the report." /> : null}</View>
      )}
    </ScrollView>
  );
}
