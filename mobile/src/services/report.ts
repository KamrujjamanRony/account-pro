import { api } from '../api/client';
import { environment } from '../config/env';
import { ApiResponse } from '../models/api-response';
import {
  BalanceSheetGroup,
  BalanceSheetLedger,
  BalanceSheetQuery,
  BalanceSheetReport,
  BalanceSheetSection,
  BalanceSide,
  BookKind,
  CashBookLine,
  CashBookReport,
  DayBookDetail,
  DayBookQuery,
  DayBookReport,
  DayBookSection,
  DayBookVoucher,
  DebitCredit,
  GeneralLedgerAccount,
  GeneralLedgerGroup,
  GeneralLedgerLine,
  GeneralLedgerQuery,
  GeneralLedgerReport,
  ProfitLossQuery,
  ProfitLossReport,
  ProfitLossRow,
  ProfitLossRowKind,
  ReceiptPaymentQuery,
  ReceiptPaymentStatement,
  ReportDateQuery,
  RpsGroup,
  RpsLine,
  RpsSection,
  TrialBalanceGroup,
  TrialBalanceLine,
  TrialBalanceQuery,
  TrialBalanceReport,
  TrialBalanceSection,
  TrialBalanceTotals,
} from '../models/report';

type Row = Record<string, unknown>;

const base = '/Report';

const DAY_BOOK_TYPE_LABELS: Record<string, string> = {
  CR: 'Cash Receive',
  CP: 'Cash Payment',
  BR: 'Bank Receive',
  BP: 'Bank Payment',
  CV: 'Contra Voucher',
  JV: 'Journal Voucher',
};

// ---- generic value helpers ------------------------------------------------

/** First defined value among the given keys (case-insensitive). */
function pick(row: Row, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null) return row[key];
    const found = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
    if (found && row[found] != null) return row[found];
  }
  return undefined;
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Loose truthiness for API flags that may arrive as boolean, number or string. */
function truthy(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return ['true', '1', 'yes', 'y'].includes(value.trim().toLowerCase());
  return false;
}

function balanceSide(value: unknown): BalanceSide {
  const match = String(value ?? '').match(/\b(dr|cr)\b/i);
  if (!match) return '';
  return match[1].toLowerCase() === 'cr' ? 'Cr' : 'Dr';
}

function toBalance(value: unknown): { balance: number; side: BalanceSide } {
  if (value != null && typeof value === 'object') {
    const obj = value as Row;
    const amount = num(pick(obj, ['amount', 'balance', 'value'])) ?? 0;
    const side = balanceSide(pick(obj, ['side', 'drcr', 'type']));
    return { balance: Math.abs(amount), side: side || (amount < 0 ? 'Cr' : 'Dr') };
  }
  if (typeof value === 'string') {
    const n = num(value.replace(/[^0-9.-]/g, '')) ?? 0;
    const side = balanceSide(value) || (n < 0 ? 'Cr' : 'Dr');
    return { balance: Math.abs(n), side };
  }
  const n = num(value);
  if (n == null) return { balance: 0, side: '' };
  return { balance: Math.abs(n), side: n < 0 ? 'Cr' : 'Dr' };
}

function toDrCr(value: unknown): DebitCredit {
  const row = (value ?? {}) as Row;
  return { debit: num(pick(row, ['debit', 'dr'])) ?? 0, credit: num(pick(row, ['credit', 'cr'])) ?? 0 };
}

// ---- Cash / Bank Book -----------------------------------------------------

function isSection(row: Row, marker: string): boolean {
  const tag = String(pick(row, ['section', 'type', 'group', 'rowType']) ?? '').toLowerCase();
  return tag.includes(marker);
}

function sumField(root: Row, keys: string[], lines: CashBookLine[], field: 'receipt' | 'payment'): number {
  const given = num(pick(root, keys));
  if (given != null) return given;
  return lines.reduce((acc, l) => acc + l[field], 0);
}

function toCashLine(row: Row | null, defaultLedger: string): CashBookLine | null {
  if (!row) return null;
  return {
    date: String(pick(row, ['date', 'voucherDate', 'vDate', 'transactionDate']) ?? ''),
    voucherId: String(pick(row, ['voucherNo', 'voucherId', 'id', 'vNo', 'code']) ?? ''),
    reference: String(pick(row, ['reference', 'ref', 'refNo']) ?? ''),
    ledger: String(pick(row, ['ledger', 'ledgerName', 'name', 'account']) ?? defaultLedger),
    narration: String(pick(row, ['narration', 'remarks', 'description', 'particulars']) ?? ''),
    receipt: num(pick(row, ['receipt', 'receiptAmount', 'debit', 'dr', 'inflow'])) ?? 0,
    payment: num(pick(row, ['payment', 'paymentAmount', 'credit', 'cr', 'outflow'])) ?? 0,
  };
}

function normalizeCashBook(data: unknown, query: ReportDateQuery, kind: BookKind): CashBookReport {
  const root = (data ?? {}) as Row;
  const companyName = String(pick(root, ['companyName', 'company', 'companyTitle']) ?? environment.companyName);
  const fromDate = String(pick(root, ['fromDate', 'dateFrom', 'startDate']) ?? query.fromDate);
  const toDate = String(pick(root, ['toDate', 'dateTo', 'endDate']) ?? query.toDate);

  const rawRows = Array.isArray(data)
    ? (data as Row[])
    : ((pick(root, ['transactions', 'items', 'details', 'rows', 'lines', 'data']) as Row[]) ?? []);

  const subject = kind === 'cash' ? 'Cash' : 'Bank';
  const openingRaw = pick(root, ['opening', 'openingBalance', 'openingCash', 'openingBank']);
  const openingRows = Array.isArray(openingRaw)
    ? (openingRaw as Row[])
    : openingRaw != null
      ? [openingRaw as Row]
      : rawRows.filter((r) => isSection(r, 'open'));
  const opening = openingRows.map((r) => toCashLine(r, subject)).filter((l): l is CashBookLine => l !== null);

  const closingRaw = pick(root, ['closing', 'closingBalance', 'closingCash', 'closingBank']);
  const closingRows = Array.isArray(closingRaw)
    ? (closingRaw as Row[])
    : closingRaw != null
      ? [closingRaw as Row]
      : rawRows.filter((r) => isSection(r, 'clos'));
  const closing = closingRows.map((r) => toCashLine(r, subject)).filter((l): l is CashBookLine => l !== null);

  const transactions = rawRows
    .filter((r) => !isSection(r, 'open') && !isSection(r, 'clos'))
    .map((r) => toCashLine(r, ''))
    .filter((l): l is CashBookLine => l !== null);

  const subTotalReceipt = sumField(root, ['subTotalReceipt'], transactions, 'receipt');
  const subTotalPayment = sumField(root, ['subTotalPayment'], transactions, 'payment');

  const grandTotalReceipt =
    num(pick(root, ['grandTotalReceipt', 'totalReceipt'])) ??
    opening.reduce((acc, l) => acc + l.receipt, 0) + subTotalReceipt;
  const grandTotalPayment =
    num(pick(root, ['grandTotalPayment', 'totalPayment'])) ??
    subTotalPayment + closing.reduce((acc, l) => acc + l.payment, 0);

  return {
    companyName,
    fromDate,
    toDate,
    opening,
    transactions,
    closing,
    subTotalReceipt,
    subTotalPayment,
    grandTotalReceipt,
    grandTotalPayment,
  };
}

// ---- Receipt & Payment Statement ------------------------------------------

function toRpsLine(row: Row): RpsLine {
  return {
    ledger: String(pick(row, ['ledger', 'ledgerName', 'name', 'account']) ?? ''),
    receipt: num(pick(row, ['receipt', 'receiptAmount', 'debit', 'dr'])) ?? 0,
    payment: num(pick(row, ['payment', 'paymentAmount', 'credit', 'cr'])) ?? 0,
  };
}

function toRpsGroup(row: Row): RpsGroup {
  const rawLines = (pick(row, ['lines', 'items', 'rows', 'ledgers']) as Row[]) ?? [];
  const lines = rawLines.map(toRpsLine);
  return {
    groupName: String(pick(row, ['groupName', 'name', 'group']) ?? ''),
    lines,
    subTotalReceipt: num(pick(row, ['subTotalReceipt'])) ?? lines.reduce((a, l) => a + l.receipt, 0),
    subTotalPayment: num(pick(row, ['subTotalPayment'])) ?? lines.reduce((a, l) => a + l.payment, 0),
  };
}

function toRpsSection(row: Row | null | undefined, defaultTitle: string): RpsSection {
  const section = (row ?? {}) as Row;
  const rawGroups = (pick(section, ['groups', 'items', 'rows']) as Row[]) ?? [];
  return {
    sectionTitle: String(pick(section, ['sectionTitle', 'title']) ?? defaultTitle),
    groups: rawGroups.map(toRpsGroup),
    summaryReceipt: num(pick(section, ['summaryReceipt', 'totalReceipt'])) ?? 0,
    summaryPayment: num(pick(section, ['summaryPayment', 'totalPayment'])) ?? 0,
  };
}

function normalizeStatement(data: unknown, query: ReceiptPaymentQuery): ReceiptPaymentStatement {
  const root = (data ?? {}) as Row;
  return {
    companyName: String(pick(root, ['companyName', 'company', 'companyTitle']) ?? environment.companyName),
    title: String(pick(root, ['title']) ?? 'Receipt & Payment Statement'),
    option: String(pick(root, ['option']) ?? ''),
    fromDate: String(pick(root, ['fromDate', 'dateFrom', 'startDate']) ?? query.fromDate),
    toDate: String(pick(root, ['toDate', 'dateTo', 'endDate']) ?? query.toDate),
    openingCashBank: toRpsSection(pick(root, ['openingCashBank']) as Row, 'A. Opening Cash & Bank'),
    receiptPayment: toRpsSection(pick(root, ['receiptPayment']) as Row, 'B. Receipt & Payment'),
    closingCashBank: toRpsSection(pick(root, ['closingCashBank']) as Row, 'C. Closing Cash & Bank'),
    grandTotalReceipt: num(pick(root, ['grandTotalReceipt', 'totalReceipt'])) ?? 0,
    grandTotalPayment: num(pick(root, ['grandTotalPayment', 'totalPayment'])) ?? 0,
  };
}

// ---- Trial Balance --------------------------------------------------------

function zeroTotals(): TrialBalanceTotals {
  return {
    opening: { debit: 0, credit: 0 },
    period: { debit: 0, credit: 0 },
    closing: { debit: 0, credit: 0 },
  };
}

function addTotals(total: TrialBalanceTotals, line: TrialBalanceTotals): void {
  total.opening.debit += line.opening.debit;
  total.opening.credit += line.opening.credit;
  total.period.debit += line.period.debit;
  total.period.credit += line.period.credit;
  total.closing.debit += line.closing.debit;
  total.closing.credit += line.closing.credit;
}

function toTbLine(row: Row): TrialBalanceLine {
  return {
    ledgerCode: String(pick(row, ['ledgerCode', 'code']) ?? ''),
    ledgerName: String(pick(row, ['ledgerName', 'ledger', 'name', 'account']) ?? ''),
    groupName: String(pick(row, ['groupName', 'group']) ?? ''),
    opening: toDrCr(pick(row, ['opening', 'openingBalance'])),
    period: toDrCr(pick(row, ['period', 'current', 'currentBalance'])),
    closing: toDrCr(pick(row, ['closing', 'closingBalance'])),
  };
}

function groupTbLines(lines: TrialBalanceLine[]): TrialBalanceGroup[] {
  const groups: TrialBalanceGroup[] = [];
  const byName = new Map<string, TrialBalanceGroup>();
  for (const line of lines) {
    let group = byName.get(line.groupName);
    if (!group) {
      group = { groupName: line.groupName, lines: [], subTotal: zeroTotals() };
      byName.set(line.groupName, group);
      groups.push(group);
    }
    group.lines.push(line);
    addTotals(group.subTotal, line);
  }
  return groups;
}

function toTbSection(row: Row): TrialBalanceSection {
  const rawLedgers = (pick(row, ['ledgers', 'lines', 'items', 'rows']) as Row[]) ?? [];
  const lines = rawLedgers.map(toTbLine);
  return {
    nature: String(pick(row, ['nature', 'type', 'natureName']) ?? ''),
    groups: groupTbLines(lines),
    total: {
      opening: toDrCr(pick(row, ['opening', 'openingBalance'])),
      period: toDrCr(pick(row, ['period', 'current', 'currentBalance'])),
      closing: toDrCr(pick(row, ['closing', 'closingBalance'])),
    },
  };
}

function normalizeTrialBalance(data: unknown, query: TrialBalanceQuery): TrialBalanceReport {
  const root = (data ?? {}) as Row;
  const rawSections = (pick(root, ['sections', 'items', 'rows']) as Row[]) ?? [];
  return {
    companyName: String(pick(root, ['companyName', 'company', 'companyTitle']) ?? environment.companyName),
    title: String(pick(root, ['title']) ?? 'Trial Balance'),
    fromDate: String(pick(root, ['fromDate', 'dateFrom', 'startDate']) ?? query.fromDate),
    toDate: String(pick(root, ['toDate', 'dateTo', 'endDate']) ?? query.toDate),
    sections: rawSections.map(toTbSection),
    grandTotal: {
      opening: toDrCr(pick(root, ['grandOpening', 'openingTotal'])),
      period: toDrCr(pick(root, ['grandPeriod', 'currentTotal', 'periodTotal'])),
      closing: toDrCr(pick(root, ['grandClosing', 'closingTotal'])),
    },
  };
}

// ---- General Ledger -------------------------------------------------------

function toGlLine(row: Row): GeneralLedgerLine {
  const narration = String(pick(row, ['narration', 'remarks', 'description', 'particulars']) ?? '');
  const isOpening = truthy(pick(row, ['isOpening', 'opening'])) || /^\s*opening/i.test(narration);
  const bal = toBalance(pick(row, ['balance', 'runningBalance', 'closingBalance']));
  return {
    date: String(pick(row, ['date', 'voucherDate', 'vDate', 'transactionDate']) ?? ''),
    voucherNo: String(pick(row, ['voucherNo', 'vchNo', 'voucherId', 'vNo', 'code']) ?? ''),
    narration,
    shortNarration: String(pick(row, ['shortNarration', 'shortNote', 'narrationShort']) ?? ''),
    debit: num(pick(row, ['debit', 'dr', 'debitAmount', 'drAmount'])) ?? 0,
    credit: num(pick(row, ['credit', 'cr', 'creditAmount', 'crAmount'])) ?? 0,
    balance: bal.balance,
    balanceSide: bal.side,
    isOpening,
  };
}

function toGlAccount(row: Row): GeneralLedgerAccount {
  const rawLines = (pick(row, ['lines', 'transactions', 'items', 'rows', 'entries']) as Row[]) ?? [];
  const lines = rawLines.map(toGlLine);
  const movement = lines.filter((l) => !l.isOpening);
  const subTotalDebit =
    num(pick(row, ['subTotalDebit', 'totalDebit'])) ?? movement.reduce((sum, l) => sum + l.debit, 0);
  const subTotalCredit =
    num(pick(row, ['subTotalCredit', 'totalCredit'])) ?? movement.reduce((sum, l) => sum + l.credit, 0);
  return {
    ledgerName: String(pick(row, ['ledgerName', 'ledger', 'name', 'account']) ?? ''),
    lines,
    subTotalDebit,
    subTotalCredit,
    hasSubTotal: movement.length > 1,
  };
}

function glGroupClosing(row: Row, accounts: GeneralLedgerAccount[]): { balance: number; side: BalanceSide } {
  const apiVal = pick(row, ['closingBalance', 'balance', 'summaryBalance']);
  if (apiVal != null) return toBalance(apiVal);
  let signed = 0;
  for (const account of accounts) {
    const last = account.lines[account.lines.length - 1];
    if (last) signed += last.balanceSide === 'Cr' ? -last.balance : last.balance;
  }
  return { balance: Math.abs(signed), side: signed < 0 ? 'Cr' : 'Dr' };
}

function toGlGroup(row: Row): GeneralLedgerGroup {
  const rawAccounts = (pick(row, ['accounts', 'ledgers', 'items', 'rows']) as Row[]) ?? [];
  const accounts = rawAccounts.map(toGlAccount);
  const summaryDebit =
    num(pick(row, ['summaryDebit', 'totalDebit', 'debit'])) ?? accounts.reduce((s, a) => s + a.subTotalDebit, 0);
  const summaryCredit =
    num(pick(row, ['summaryCredit', 'totalCredit', 'credit'])) ?? accounts.reduce((s, a) => s + a.subTotalCredit, 0);
  const closing = glGroupClosing(row, accounts);
  return {
    groupName: String(pick(row, ['groupName', 'group', 'name']) ?? ''),
    accounts,
    summaryDebit,
    summaryCredit,
    closingBalance: closing.balance,
    closingSide: closing.side,
  };
}

function buildGlGroupsFromRows(rows: Row[]): GeneralLedgerGroup[] {
  const order: string[] = [];
  const byGroup = new Map<string, Map<string, Row[]>>();
  for (const row of rows) {
    const groupName = String(pick(row, ['groupName', 'group']) ?? '');
    const ledgerName = String(pick(row, ['ledgerName', 'ledger', 'account', 'name']) ?? '');
    let ledgers = byGroup.get(groupName);
    if (!ledgers) {
      ledgers = new Map<string, Row[]>();
      byGroup.set(groupName, ledgers);
      order.push(groupName);
    }
    const lines = ledgers.get(ledgerName);
    if (lines) lines.push(row);
    else ledgers.set(ledgerName, [row]);
  }
  return order.map((groupName) => {
    const accounts: Row[] = [];
    for (const [ledgerName, lines] of byGroup.get(groupName)!) accounts.push({ ledgerName, lines });
    return toGlGroup({ groupName, accounts });
  });
}

function normalizeGeneralLedger(data: unknown, query: GeneralLedgerQuery): GeneralLedgerReport {
  const root = (data ?? {}) as Row;
  const groups = Array.isArray(data)
    ? buildGlGroupsFromRows(data as Row[])
    : ((pick(root, ['groups', 'items', 'rows', 'data']) as Row[]) ?? []).map(toGlGroup);
  return {
    companyName: String(pick(root, ['companyName', 'company', 'companyTitle']) ?? environment.companyName),
    title: String(pick(root, ['title']) ?? 'General Ledger'),
    fromDate: String(pick(root, ['fromDate', 'dateFrom', 'startDate']) ?? query.fromDate),
    toDate: String(pick(root, ['toDate', 'dateTo', 'endDate']) ?? query.toDate),
    costCenter: String(pick(root, ['costCenter', 'costCentre']) ?? query.costCenter ?? 'all'),
    groups,
  };
}

// ---- Day Book -------------------------------------------------------------

function dayBookType(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.includes('-') || raw.includes(' ')) return raw;
  const label = DAY_BOOK_TYPE_LABELS[raw.toUpperCase()];
  return label ? `${raw.toUpperCase()} - ${label}` : raw;
}

function toDayBookDetail(row: Row): DayBookDetail {
  return {
    groupName: String(pick(row, ['groupName', 'group', 'natureName']) ?? ''),
    ledgerName: String(pick(row, ['ledgerName', 'ledger', 'name', 'account']) ?? ''),
    shortNarration: String(pick(row, ['shortNarration', 'shortNote', 'narrationShort']) ?? ''),
    debit: num(pick(row, ['debit', 'dr', 'debitAmount', 'drAmount'])) ?? 0,
    credit: num(pick(row, ['credit', 'cr', 'creditAmount', 'crAmount'])) ?? 0,
  };
}

function toDayBookVoucher(row: Row): DayBookVoucher {
  const rawDetails = (pick(row, ['details', 'lines', 'entries', 'transactions', 'rows']) as Row[]) ?? [];
  const details = rawDetails.map(toDayBookDetail);
  const subTotalDebit =
    num(pick(row, ['subTotalDebit', 'totalDebit'])) ?? details.reduce((s, d) => s + d.debit, 0);
  const subTotalCredit =
    num(pick(row, ['subTotalCredit', 'totalCredit'])) ?? details.reduce((s, d) => s + d.credit, 0);
  return {
    voucherId: String(pick(row, ['voucherId', 'voucherNo', 'id', 'vNo', 'code']) ?? ''),
    date: String(pick(row, ['date', 'voucherDate', 'vDate', 'transactionDate']) ?? ''),
    type: dayBookType(pick(row, ['type', 'voucherType', 'typeName'])),
    reference: String(pick(row, ['reference', 'ref', 'refNo']) ?? 'N/A'),
    costCenter: String(pick(row, ['costCenter', 'costCentre']) ?? ''),
    narration: String(pick(row, ['narration', 'remarks', 'description', 'particulars']) ?? ''),
    details,
    subTotalDebit,
    subTotalCredit,
  };
}

function toDayBookVouchers(rows: Row[]): DayBookVoucher[] {
  const nested = rows.some((r) => pick(r, ['details', 'lines', 'entries', 'transactions']) != null);
  if (nested) return rows.map(toDayBookVoucher);

  const order: string[] = [];
  const byId = new Map<string, { header: Row; lines: Row[] }>();
  for (const row of rows) {
    const id = String(pick(row, ['voucherId', 'voucherNo', 'id', 'vNo', 'code']) ?? '');
    let bucket = byId.get(id);
    if (!bucket) {
      bucket = { header: row, lines: [] };
      byId.set(id, bucket);
      order.push(id);
    }
    bucket.lines.push(row);
  }
  return order.map((id) => {
    const { header, lines } = byId.get(id)!;
    return toDayBookVoucher({ ...header, details: lines });
  });
}

function makeDayBookSection(name: string, vouchers: DayBookVoucher[]): DayBookSection {
  return {
    sectionName: name,
    vouchers,
    summaryDebit: vouchers.reduce((s, v) => s + v.subTotalDebit, 0),
    summaryCredit: vouchers.reduce((s, v) => s + v.subTotalCredit, 0),
  };
}

function toDayBookSection(row: Row): DayBookSection {
  const items = (pick(row, ['vouchers', 'items', 'rows', 'details', 'lines']) as Row[]) ?? [];
  const vouchers = toDayBookVouchers(items);
  const section = makeDayBookSection(String(pick(row, ['sectionName', 'section', 'name', 'title']) ?? 'Account'), vouchers);
  section.summaryDebit = num(pick(row, ['summaryDebit', 'totalDebit', 'debit'])) ?? section.summaryDebit;
  section.summaryCredit = num(pick(row, ['summaryCredit', 'totalCredit', 'credit'])) ?? section.summaryCredit;
  return section;
}

function normalizeDayBook(data: unknown, query: DayBookQuery): DayBookReport {
  const root = (data ?? {}) as Row;
  const rawSections = pick(root, ['sections', 'books', 'groups']) as Row[] | undefined;
  let sections: DayBookSection[];
  if (Array.isArray(rawSections) && rawSections.length) {
    sections = rawSections.map(toDayBookSection);
  } else {
    const items = Array.isArray(data)
      ? (data as Row[])
      : ((pick(root, ['vouchers', 'items', 'rows', 'data', 'details']) as Row[]) ?? []);
    sections = [makeDayBookSection('Account', toDayBookVouchers(items))];
  }
  return {
    companyName: String(pick(root, ['companyName', 'company', 'companyTitle']) ?? environment.companyName),
    title: String(pick(root, ['title']) ?? 'Day Book'),
    fromDate: String(pick(root, ['fromDate', 'dateFrom', 'startDate']) ?? query.fromDate),
    toDate: String(pick(root, ['toDate', 'dateTo', 'endDate']) ?? query.toDate),
    sections,
  };
}

// ---- Balance Sheet --------------------------------------------------------

function toBsLedger(row: Row): BalanceSheetLedger {
  return {
    ledgerCode: String(pick(row, ['ledgerCode', 'code']) ?? ''),
    name: String(pick(row, ['ledgerName', 'name', 'ledger', 'account']) ?? ''),
    amount: num(pick(row, ['amount', 'balance', 'total'])) ?? 0,
  };
}

function toBsGroup(row: Row): BalanceSheetGroup {
  const rawLedgers = (pick(row, ['ledgers', 'accounts', 'items', 'lines', 'rows']) as Row[]) ?? [];
  const ledgers = rawLedgers.map(toBsLedger);
  return {
    groupName: String(pick(row, ['groupName', 'group', 'name', 'title']) ?? ''),
    amount:
      num(pick(row, ['subtotal', 'subTotal', 'amount', 'balance', 'total'])) ??
      ledgers.reduce((sum, l) => sum + l.amount, 0),
    ledgers,
  };
}

function toBsSection(row: Row, defaultName: string): BalanceSheetSection {
  const section = (row ?? {}) as Row;
  const rawGroups = (pick(section, ['groups', 'items', 'rows', 'lines']) as Row[]) ?? [];
  const groups = rawGroups.map(toBsGroup);
  return {
    sectionName: String(pick(section, ['title', 'sectionName', 'section', 'name']) ?? defaultName),
    groups,
    subTotal: num(pick(section, ['total', 'subTotal', 'subtotal'])) ?? groups.reduce((sum, g) => sum + g.amount, 0),
  };
}

function normalizeBalanceSheet(data: unknown, query: BalanceSheetQuery): BalanceSheetReport {
  const root = (data ?? {}) as Row;
  const assetsRaw = (pick(root, ['assets', 'asset']) as Row) ?? {};
  const liabilitiesRaw = (pick(root, ['liabilities', 'liability']) as Row) ?? {};
  const equityRaw = (pick(root, ['equity']) as Row) ?? {};

  const assets = toBsSection(assetsRaw, 'Assets');
  const liabilities = toBsSection(liabilitiesRaw, 'Liabilities');
  const equity = toBsSection(equityRaw, 'Equity');

  const totalAssets =
    num(pick(root, ['totalAssets'])) ?? num(pick(assetsRaw, ['total'])) ?? assets.subTotal;
  const totalLiabEquity =
    num(pick(root, ['totalLiabilitiesAndEquity', 'totalLiabilities'])) ?? liabilities.subTotal + equity.subTotal;

  const liabilitySections = [liabilities];
  if (equity.groups.length) liabilitySections.push(equity);

  return {
    companyName: String(pick(root, ['companyName', 'company', 'companyTitle']) ?? environment.companyName),
    title: String(pick(root, ['title']) ?? 'Balance Sheet'),
    asOfDate: String(pick(root, ['asOfDate', 'asOnDate', 'date', 'toDate']) ?? query.asOfDate),
    fiscalYearStart: String(pick(root, ['fiscalYearStart', 'fromDate', 'yearStart']) ?? query.fiscalYearStart),
    assets: { title: 'Assets', sections: [assets], summary: totalAssets },
    liabilities: { title: 'Liabilities', sections: liabilitySections, summary: totalLiabEquity },
    difference: num(pick(root, ['difference'])) ?? totalAssets - totalLiabEquity,
    isBalanced: truthy(pick(root, ['isBalanced'])),
  };
}

// ---- Profit & Loss --------------------------------------------------------

function plHeadingRow(label: string): ProfitLossRow {
  return { label, uptoPrevious: 0, currentPeriod: 0, amount: 0, level: 0, kind: 'section' };
}

function plTotalRow(
  label: string,
  root: Row,
  kind: ProfitLossRowKind,
  [upKey, currentKey, amountKey]: [string, string, string],
): ProfitLossRow {
  return {
    label,
    uptoPrevious: num(pick(root, [upKey])) ?? 0,
    currentPeriod: num(pick(root, [currentKey])) ?? 0,
    amount: num(pick(root, [amountKey])) ?? 0,
    level: 0,
    kind,
  };
}

function flattenPlNodes(nodes: Row[], depth: number, out: ProfitLossRow[]): void {
  for (const node of nodes) {
    const children = (pick(node, ['children', 'groups', 'ledgers', 'items']) as Row[]) ?? [];
    const label = String(pick(node, ['name', 'label', 'groupName', 'title', 'ledgerName']) ?? '');
    const kind: ProfitLossRowKind = truthy(pick(node, ['isLedger'])) ? 'ledger' : 'group';
    out.push({
      label,
      uptoPrevious: num(pick(node, ['uptoPrevious', 'upToPrevious', 'previous'])) ?? 0,
      currentPeriod: num(pick(node, ['currentPeriod', 'current', 'period'])) ?? 0,
      amount: num(pick(node, ['amount', 'total', 'closing'])) ?? 0,
      level: depth,
      kind,
    });
    if (children.length) flattenPlNodes(children, depth + 1, out);
  }
}

function normalizeProfitLoss(data: unknown, query: ProfitLossQuery): ProfitLossReport {
  const root = (data ?? {}) as Row;
  const rows: ProfitLossRow[] = [];

  const income = (pick(root, ['income', 'incomes']) as Row[]) ?? [];
  const expense = (pick(root, ['expense', 'expenses']) as Row[]) ?? [];

  if (income.length) {
    rows.push(plHeadingRow('Income'));
    flattenPlNodes(income, 1, rows);
    rows.push(
      plTotalRow('Total Income :', root, 'subtotal', [
        'totalIncomeUptoPrevious',
        'totalIncomeCurrentPeriod',
        'totalIncomeAmount',
      ]),
    );
  }

  if (expense.length) {
    rows.push(plHeadingRow('Expense'));
    flattenPlNodes(expense, 1, rows);
    rows.push(
      plTotalRow('Total Expense :', root, 'subtotal', [
        'totalExpenseUptoPrevious',
        'totalExpenseCurrentPeriod',
        'totalExpenseAmount',
      ]),
    );
  }

  if (pick(root, ['grossProfitAmount', 'grossProfitCurrentPeriod', 'grossProfitUptoPrevious']) != null) {
    rows.push(
      plTotalRow('Summary for Gross Profit :', root, 'summary', [
        'grossProfitUptoPrevious',
        'grossProfitCurrentPeriod',
        'grossProfitAmount',
      ]),
    );
  }

  const isProfit = truthy(pick(root, ['isProfit']));
  rows.push(
    plTotalRow(`Net ${isProfit ? 'Profit' : 'Loss'} :`, root, 'net', [
      'netProfitUptoPrevious',
      'netProfitCurrentPeriod',
      'netProfitAmount',
    ]),
  );

  return {
    companyName: String(pick(root, ['companyName', 'company', 'companyTitle']) ?? environment.companyName),
    title: String(pick(root, ['title']) ?? 'Profit & Loss Account'),
    fromDate: String(pick(root, ['fromDate', 'dateFrom', 'startDate']) ?? query.fromDate),
    toDate: String(pick(root, ['toDate', 'dateTo', 'endDate']) ?? query.toDate),
    costCenter: String(pick(root, ['costCenter', 'costCentre']) ?? query.costCenter ?? 'all'),
    level: String(pick(root, ['level']) ?? query.level),
    rows,
  };
}

// ---- public API -----------------------------------------------------------

export const reportService = {
  async cashBook(query: ReportDateQuery): Promise<CashBookReport> {
    const res = await api.post<ApiResponse<unknown>>(`${base}/CashBook`, query);
    return normalizeCashBook(res?.data, query, 'cash');
  },
  async bankBook(query: ReportDateQuery): Promise<CashBookReport> {
    const res = await api.post<ApiResponse<unknown>>(`${base}/BankBook`, query);
    return normalizeCashBook(res?.data, query, 'bank');
  },
  async receiptPaymentStatement(query: ReceiptPaymentQuery): Promise<ReceiptPaymentStatement> {
    const body: ReceiptPaymentQuery = {
      fromDate: query.fromDate,
      toDate: query.toDate,
      groupName: query.groupName ?? null,
      ledger: query.ledger ?? null,
    };
    const res = await api.post<ApiResponse<unknown>>(`${base}/ReceiptPaymentStatement`, body);
    return normalizeStatement(res?.data, query);
  },
  async trialBalance(query: TrialBalanceQuery): Promise<TrialBalanceReport> {
    const body: TrialBalanceQuery = {
      fromDate: query.fromDate,
      toDate: query.toDate,
      ledger: query.ledger ?? null,
      groupName: query.groupName ?? null,
    };
    const res = await api.post<ApiResponse<unknown>>(`${base}/TrialBalance-2`, body);
    return normalizeTrialBalance(res?.data, query);
  },
  async generalLedger(query: GeneralLedgerQuery): Promise<GeneralLedgerReport> {
    const body: GeneralLedgerQuery = {
      fromDate: query.fromDate,
      toDate: query.toDate,
      groupName: query.groupName ?? null,
      ledger: query.ledger ?? null,
      costCenter: query.costCenter ?? null,
    };
    const res = await api.post<ApiResponse<unknown>>(`${base}/GeneralLedger`, body);
    return normalizeGeneralLedger(res?.data, query);
  },
  async dayBook(query: DayBookQuery): Promise<DayBookReport> {
    const body: DayBookQuery = {
      fromDate: query.fromDate,
      toDate: query.toDate,
      type: query.type ?? null,
      groupName: query.groupName?.length ? query.groupName : null,
      ledger: query.ledger?.length ? query.ledger : null,
      costCenter: query.costCenter ?? null,
    };
    const res = await api.post<ApiResponse<unknown>>(`${base}/DayBook`, body);
    return normalizeDayBook(res?.data, query);
  },
  async balanceSheet(query: BalanceSheetQuery): Promise<BalanceSheetReport> {
    const body: BalanceSheetQuery = { asOfDate: query.asOfDate, fiscalYearStart: query.fiscalYearStart };
    const res = await api.post<ApiResponse<unknown>>(`${base}/BalanceSheet`, body);
    return normalizeBalanceSheet(res?.data, query);
  },
  async profitLoss(query: ProfitLossQuery): Promise<ProfitLossReport> {
    const body: ProfitLossQuery = {
      fromDate: query.fromDate,
      toDate: query.toDate,
      costCenter: query.costCenter ?? null,
      level: query.level,
    };
    const res = await api.post<ApiResponse<unknown>>(`${base}/ProfitLoss`, body);
    return normalizeProfitLoss(res?.data, query);
  },
};
