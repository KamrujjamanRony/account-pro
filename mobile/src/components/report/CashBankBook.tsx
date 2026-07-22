import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../config/theme';
import { reportService } from '../../services/report';
import { BookKind, CashBookLine, CashBookReport } from '../../models/report';
import { startOfYearIso, todayIso, formatDate, money } from '../../lib/format';
import { errMessage, notify } from '../../lib/alerts';
import { printDocument, escapeHtml } from '../../lib/print';
import { Card, T, EmptyState } from '../ui/layout';
import { DateRangeFilter } from './FilterBar';
import { Letterhead } from './Letterhead';
import { ReportActions } from './ReportActions';
import { HScroll, Row, Cell, MoneyCell, BandRow } from './table';

const W = { date: 76, id: 64, ref: 60, ledger: 130, narration: 140, receipt: 92, payment: 92 };

export function CashBankBook({ kind }: { kind: BookKind }) {
  const { palette } = useTheme();
  const [fromDate, setFromDate] = useState(startOfYearIso());
  const [toDate, setToDate] = useState(todayIso());
  const [report, setReport] = useState<CashBookReport | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const data = kind === 'cash' ? await reportService.cashBook({ fromDate, toDate }) : await reportService.bankBook({ fromDate, toDate });
      setReport(data);
    } catch (err) {
      notify('Error', errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const title = kind === 'cash' ? 'Cash Book' : 'Bank Book';

  const HeaderRow = () => (
    <Row header>
      <Cell w={W.date} bold>
        Date
      </Cell>
      <Cell w={W.id} bold>
        ID
      </Cell>
      <Cell w={W.ref} bold>
        Ref
      </Cell>
      <Cell w={W.ledger} bold>
        Ledger
      </Cell>
      <Cell w={W.narration} bold>
        Narration
      </Cell>
      <Cell w={W.receipt} align="right" bold>
        Receipt
      </Cell>
      <Cell w={W.payment} align="right" bold>
        Payment
      </Cell>
    </Row>
  );

  const LineRow = ({ l }: { l: CashBookLine }) => (
    <Row>
      <Cell w={W.date}>{formatDate(l.date)}</Cell>
      <Cell w={W.id}>{l.voucherId}</Cell>
      <Cell w={W.ref}>{l.reference}</Cell>
      <Cell w={W.ledger}>{l.ledger}</Cell>
      <Cell w={W.narration}>{l.narration}</Cell>
      <MoneyCell value={l.receipt} w={W.receipt} />
      <MoneyCell value={l.payment} w={W.payment} />
    </Row>
  );

  const buildHtml = (): string => {
    if (!report) return '';
    const rowHtml = (l: CashBookLine) =>
      `<tr><td>${escapeHtml(formatDate(l.date))}</td><td>${escapeHtml(l.voucherId)}</td><td>${escapeHtml(l.reference)}</td><td>${escapeHtml(
        l.ledger,
      )}</td><td>${escapeHtml(l.narration)}</td><td class="r">${l.receipt ? money(l.receipt) : ''}</td><td class="r">${l.payment ? money(l.payment) : ''}</td></tr>`;
    const band = (label: string) => `<tr class="band"><td colspan="7">${escapeHtml(label)}</td></tr>`;
    const body = `
      <h1>${escapeHtml(report.companyName)}</h1>
      <div class="title">${escapeHtml(title)}</div>
      <div class="range">${escapeHtml(formatDate(report.fromDate))} to ${escapeHtml(formatDate(report.toDate))}</div>
      <table><thead><tr><th>Date</th><th>ID</th><th>Ref</th><th>Ledger</th><th>Narration</th><th class="r">Receipt</th><th class="r">Payment</th></tr></thead>
      <tbody>
      ${band('A. Opening')}${report.opening.map(rowHtml).join('')}
      ${band('B. Receipt & Payment')}${report.transactions.map(rowHtml).join('')}
      <tr class="b"><td colspan="5" class="r">Sub Total</td><td class="r">${money(report.subTotalReceipt)}</td><td class="r">${money(report.subTotalPayment)}</td></tr>
      ${band('C. Closing')}${report.closing.map(rowHtml).join('')}
      </tbody>
      <tfoot><tr><td colspan="5" class="r">Grand Total</td><td class="r">${money(report.grandTotalReceipt)}</td><td class="r">${money(report.grandTotalPayment)}</td></tr></tfoot>
      </table>`;
    return printDocument(title, body);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.bg }} contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFrom={setFromDate} onTo={setToDate} onApply={run} loading={loading} />

      {report ? (
        <>
          <Card>
            <Letterhead companyName={report.companyName} title={title} fromDate={report.fromDate} toDate={report.toDate} />
            <HScroll>
              <HeaderRow />
              <BandRow label="A. Opening" tone="section" />
              {report.opening.map((l, i) => (
                <LineRow key={`o${i}`} l={l} />
              ))}
              <BandRow label="B. Receipt & Payment" tone="section" />
              {report.transactions.map((l, i) => (
                <LineRow key={`t${i}`} l={l} />
              ))}
              <Row highlight>
                <Cell w={W.date + W.id + W.ref + W.ledger + W.narration} align="right" bold>
                  Sub Total
                </Cell>
                <MoneyCell value={report.subTotalReceipt} w={W.receipt} bold />
                <MoneyCell value={report.subTotalPayment} w={W.payment} bold />
              </Row>
              <BandRow label="C. Closing" tone="section" />
              {report.closing.map((l, i) => (
                <LineRow key={`c${i}`} l={l} />
              ))}
              <Row highlight>
                <Cell w={W.date + W.id + W.ref + W.ledger + W.narration} align="right" bold>
                  Grand Total
                </Cell>
                <MoneyCell value={report.grandTotalReceipt} w={W.receipt} bold />
                <MoneyCell value={report.grandTotalPayment} w={W.payment} bold />
              </Row>
            </HScroll>
          </Card>
          <ReportActions buildHtml={buildHtml} />
        </>
      ) : (
        <View style={{ marginTop: spacing.xl }}>
          {!loading ? <EmptyState title={`${title}`} message="Choose a date range and generate the report." /> : null}
        </View>
      )}
    </ScrollView>
  );
}
