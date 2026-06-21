import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
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
  DebitCredit,
  GeneralLedgerAccount,
  GeneralLedgerGroup,
  GeneralLedgerLine,
  GeneralLedgerQuery,
  GeneralLedgerReport,
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
} from '../models/report.model';

type Row = Record<string, unknown>;

@Service()
export class ReportService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/Report`;

  /** Cash Book — receipts & payments through the cash ledgers for a date range. */
  cashBook(query: ReportDateQuery): Observable<CashBookReport> {
    return this.fetch('CashBook', query, 'cash');
  }

  /** Bank Book — receipts & payments through the bank ledgers for a date range. */
  bankBook(query: ReportDateQuery): Observable<CashBookReport> {
    return this.fetch('BankBook', query, 'bank');
  }

  /**
   * Receipt & Payment Statement — opening / receipt & payment / closing,
   * grouped by ledger group, for a date range.
   */
  receiptPaymentStatement(query: ReceiptPaymentQuery): Observable<ReceiptPaymentStatement> {
    const body: ReceiptPaymentQuery = {
      fromDate: query.fromDate,
      toDate: query.toDate,
      groupName: query.groupName ?? null,
      ledger: query.ledger ?? null,
    };
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/ReceiptPaymentStatement`, body)
      .pipe(map(res => this.normalizeStatement(res?.data, query)));
  }

  /**
   * Trial Balance — every ledger's Opening / Current / Closing debit-credit
   * balances, grouped by nature (Asset / Liability / Income / Expense) and
   * ledger group, for a date range.
   */
  trialBalance(query: TrialBalanceQuery): Observable<TrialBalanceReport> {
    const body: TrialBalanceQuery = {
      fromDate: query.fromDate,
      toDate: query.toDate,
      ledger: query.ledger ?? null,
      groupName: query.groupName ?? null,
    };
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/TrialBalance-2`, body)
      .pipe(map(res => this.normalizeTrialBalance(res?.data, query)));
  }

  /**
   * General Ledger — every posting for each ledger, grouped by ledger group,
   * with a per-ledger Sub Total and per-group Summary, for a date range.
   * Optional {@link GeneralLedgerQuery.groupName}, {@link GeneralLedgerQuery.ledger}
   * and {@link GeneralLedgerQuery.costCenter} narrow the result server-side.
   */
  generalLedger(query: GeneralLedgerQuery): Observable<GeneralLedgerReport> {
    const body: GeneralLedgerQuery = {
      fromDate: query.fromDate,
      toDate: query.toDate,
      groupName: query.groupName ?? null,
      ledger: query.ledger ?? null,
      costCenter: query.costCenter ?? null,
    };
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/GeneralLedger`, body)
      .pipe(map(res => this.normalizeGeneralLedger(res?.data, query)));
  }

  /**
   * Balance Sheet — Assets vs Liabilities snapshot as on a date, grouped into
   * sections (Current / Non-Current / Equity) → groups, with optional ledger
   * detail. The endpoint takes the snapshot date and the fiscal-year start.
   */
  balanceSheet(query: BalanceSheetQuery): Observable<BalanceSheetReport> {
    const body: BalanceSheetQuery = {
      asOfDate: query.asOfDate,
      fiscalYearStart: query.fiscalYearStart,
    };
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/BalanceSheet`, body)
      .pipe(map(res => this.normalizeBalanceSheet(res?.data, query)));
  }

  /**
   * Reshape the (loosely-typed) Balance Sheet payload into a
   * {@link BalanceSheetReport}. The API returns three sibling blocks — `assets`,
   * `liabilities` and `equity` — each a flat list of groups with a `total`. We
   * keep Assets as one section and fold Equity into the Liabilities side as its
   * own section, mirroring the printed layout, so both sides summarise to the
   * server's `totalAssets` / `totalLiabilitiesAndEquity`.
   */
  private normalizeBalanceSheet(data: unknown, query: BalanceSheetQuery): BalanceSheetReport {
    const root = (data ?? {}) as Row;
    const assetsRaw = (this.pick(root, ['assets', 'asset']) as Row) ?? {};
    const liabilitiesRaw = (this.pick(root, ['liabilities', 'liability']) as Row) ?? {};
    const equityRaw = (this.pick(root, ['equity']) as Row) ?? {};

    const assets = this.toBsSection(assetsRaw, 'Assets');
    const liabilities = this.toBsSection(liabilitiesRaw, 'Liabilities');
    const equity = this.toBsSection(equityRaw, 'Equity');

    const totalAssets =
      this.num(this.pick(root, ['totalAssets'])) ??
      this.num(this.pick(assetsRaw, ['total'])) ??
      assets.subTotal;
    const totalLiabEquity =
      this.num(this.pick(root, ['totalLiabilitiesAndEquity', 'totalLiabilities'])) ??
      liabilities.subTotal + equity.subTotal;

    const liabilitySections = [liabilities];
    if (equity.groups.length) liabilitySections.push(equity);

    return {
      companyName: String(
        this.pick(root, ['companyName', 'company', 'companyTitle']) ?? environment.companyName,
      ),
      title: String(this.pick(root, ['title']) ?? 'Balance Sheet'),
      asOfDate: String(
        this.pick(root, ['asOfDate', 'asOnDate', 'date', 'toDate']) ?? query.asOfDate,
      ),
      fiscalYearStart: String(
        this.pick(root, ['fiscalYearStart', 'fromDate', 'yearStart']) ?? query.fiscalYearStart,
      ),
      assets: { title: 'Assets', sections: [assets], summary: totalAssets },
      liabilities: { title: 'Liabilities', sections: liabilitySections, summary: totalLiabEquity },
      difference: this.num(this.pick(root, ['difference'])) ?? totalAssets - totalLiabEquity,
      isBalanced: this.truthy(this.pick(root, ['isBalanced'])),
    };
  }

  private toBsSection(row: Row, defaultName: string): BalanceSheetSection {
    const section = (row ?? {}) as Row;
    const rawGroups = (this.pick(section, ['groups', 'items', 'rows', 'lines']) as Row[]) ?? [];
    const groups = rawGroups.map(g => this.toBsGroup(g));
    return {
      sectionName: String(this.pick(section, ['title', 'sectionName', 'section', 'name']) ?? defaultName),
      groups,
      subTotal:
        this.num(this.pick(section, ['total', 'subTotal', 'subtotal'])) ??
        groups.reduce((sum, g) => sum + g.amount, 0),
    };
  }

  private toBsGroup(row: Row): BalanceSheetGroup {
    const rawLedgers = (this.pick(row, ['ledgers', 'accounts', 'items', 'lines', 'rows']) as Row[]) ?? [];
    const ledgers = rawLedgers.map(l => this.toBsLedger(l));
    return {
      groupName: String(this.pick(row, ['groupName', 'group', 'name', 'title']) ?? ''),
      amount:
        this.num(this.pick(row, ['subtotal', 'subTotal', 'amount', 'balance', 'total'])) ??
        ledgers.reduce((sum, l) => sum + l.amount, 0),
      ledgers,
    };
  }

  private toBsLedger(row: Row): BalanceSheetLedger {
    return {
      ledgerCode: String(this.pick(row, ['ledgerCode', 'code']) ?? ''),
      name: String(this.pick(row, ['ledgerName', 'name', 'ledger', 'account']) ?? ''),
      amount: this.num(this.pick(row, ['amount', 'balance', 'total'])) ?? 0,
    };
  }

  private normalizeTrialBalance(data: unknown, query: TrialBalanceQuery): TrialBalanceReport {
    const root = (data ?? {}) as Row;
    const rawSections = (this.pick(root, ['sections', 'items', 'rows']) as Row[]) ?? [];
    return {
      companyName: String(
        this.pick(root, ['companyName', 'company', 'companyTitle']) ?? environment.companyName,
      ),
      title: String(this.pick(root, ['title']) ?? 'Trial Balance'),
      fromDate: String(this.pick(root, ['fromDate', 'dateFrom', 'startDate']) ?? query.fromDate),
      toDate: String(this.pick(root, ['toDate', 'dateTo', 'endDate']) ?? query.toDate),
      sections: rawSections.map(s => this.toTbSection(s)),
      grandTotal: {
        opening: this.toDrCr(this.pick(root, ['grandOpening', 'openingTotal'])),
        period: this.toDrCr(this.pick(root, ['grandPeriod', 'currentTotal', 'periodTotal'])),
        closing: this.toDrCr(this.pick(root, ['grandClosing', 'closingTotal'])),
      },
    };
  }

  private toTbSection(row: Row): TrialBalanceSection {
    const rawLedgers = (this.pick(row, ['ledgers', 'lines', 'items', 'rows']) as Row[]) ?? [];
    const lines = rawLedgers.map(l => this.toTbLine(l));
    return {
      nature: String(this.pick(row, ['nature', 'type', 'natureName']) ?? ''),
      groups: this.groupTbLines(lines),
      total: {
        opening: this.toDrCr(this.pick(row, ['opening', 'openingBalance'])),
        period: this.toDrCr(this.pick(row, ['period', 'current', 'currentBalance'])),
        closing: this.toDrCr(this.pick(row, ['closing', 'closingBalance'])),
      },
    };
  }

  private toTbLine(row: Row): TrialBalanceLine {
    return {
      ledgerCode: String(this.pick(row, ['ledgerCode', 'code']) ?? ''),
      ledgerName: String(this.pick(row, ['ledgerName', 'ledger', 'name', 'account']) ?? ''),
      groupName: String(this.pick(row, ['groupName', 'group']) ?? ''),
      opening: this.toDrCr(this.pick(row, ['opening', 'openingBalance'])),
      period: this.toDrCr(this.pick(row, ['period', 'current', 'currentBalance'])),
      closing: this.toDrCr(this.pick(row, ['closing', 'closingBalance'])),
    };
  }

  /** Read a {debit, credit} pair, tolerating dr/cr aliases and missing values. */
  private toDrCr(value: unknown): DebitCredit {
    const row = (value ?? {}) as Row;
    return {
      debit: this.num(this.pick(row, ['debit', 'dr'])) ?? 0,
      credit: this.num(this.pick(row, ['credit', 'cr'])) ?? 0,
    };
  }

  /** Bucket ledger lines by group name (first-seen order), summing sub totals. */
  private groupTbLines(lines: TrialBalanceLine[]): TrialBalanceGroup[] {
    const groups: TrialBalanceGroup[] = [];
    const byName = new Map<string, TrialBalanceGroup>();
    for (const line of lines) {
      let group = byName.get(line.groupName);
      if (!group) {
        group = { groupName: line.groupName, lines: [], subTotal: this.zeroTotals() };
        byName.set(line.groupName, group);
        groups.push(group);
      }
      group.lines.push(line);
      this.addTotals(group.subTotal, line);
    }
    return groups;
  }

  private zeroTotals(): TrialBalanceTotals {
    return {
      opening: { debit: 0, credit: 0 },
      period: { debit: 0, credit: 0 },
      closing: { debit: 0, credit: 0 },
    };
  }

  private addTotals(total: TrialBalanceTotals, line: TrialBalanceTotals): void {
    total.opening.debit += line.opening.debit;
    total.opening.credit += line.opening.credit;
    total.period.debit += line.period.debit;
    total.period.credit += line.period.credit;
    total.closing.debit += line.closing.debit;
    total.closing.credit += line.closing.credit;
  }

  /**
   * Reshape the (loosely-typed) General Ledger payload into a {@link GeneralLedgerReport}.
   * The payload may already be nested as group → account → lines, or arrive as a
   * flat array of posting rows tagged with group/ledger, which we bucket here.
   */
  private normalizeGeneralLedger(data: unknown, query: GeneralLedgerQuery): GeneralLedgerReport {
    const root = (data ?? {}) as Row;
    const groups = Array.isArray(data)
      ? this.buildGlGroupsFromRows(data as Row[])
      : ((this.pick(root, ['groups', 'items', 'rows', 'data']) as Row[]) ?? []).map(g => this.toGlGroup(g));
    return {
      companyName: String(
        this.pick(root, ['companyName', 'company', 'companyTitle']) ?? environment.companyName,
      ),
      title: String(this.pick(root, ['title']) ?? 'General Ledger'),
      fromDate: String(this.pick(root, ['fromDate', 'dateFrom', 'startDate']) ?? query.fromDate),
      toDate: String(this.pick(root, ['toDate', 'dateTo', 'endDate']) ?? query.toDate),
      costCenter: String(
        this.pick(root, ['costCenter', 'costCentre']) ?? query.costCenter ?? 'all',
      ),
      groups,
    };
  }

  /** Bucket flat posting rows by group then ledger (first-seen order) into group structures. */
  private buildGlGroupsFromRows(rows: Row[]): GeneralLedgerGroup[] {
    const order: string[] = [];
    const byGroup = new Map<string, Map<string, Row[]>>();
    for (const row of rows) {
      const groupName = String(this.pick(row, ['groupName', 'group']) ?? '');
      const ledgerName = String(this.pick(row, ['ledgerName', 'ledger', 'account', 'name']) ?? '');
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
    return order.map(groupName => {
      const accounts: Row[] = [];
      for (const [ledgerName, lines] of byGroup.get(groupName)!) {
        accounts.push({ ledgerName, lines });
      }
      return this.toGlGroup({ groupName, accounts });
    });
  }

  private toGlGroup(row: Row): GeneralLedgerGroup {
    const rawAccounts = (this.pick(row, ['accounts', 'ledgers', 'items', 'rows']) as Row[]) ?? [];
    const accounts = rawAccounts.map(a => this.toGlAccount(a));
    const summaryDebit =
      this.num(this.pick(row, ['summaryDebit', 'totalDebit', 'debit'])) ??
      accounts.reduce((sum, a) => sum + a.subTotalDebit, 0);
    const summaryCredit =
      this.num(this.pick(row, ['summaryCredit', 'totalCredit', 'credit'])) ??
      accounts.reduce((sum, a) => sum + a.subTotalCredit, 0);
    const closing = this.glGroupClosing(row, accounts);
    return {
      groupName: String(this.pick(row, ['groupName', 'group', 'name']) ?? ''),
      accounts,
      summaryDebit,
      summaryCredit,
      closingBalance: closing.balance,
      closingSide: closing.side,
    };
  }

  private toGlAccount(row: Row): GeneralLedgerAccount {
    const rawLines = (this.pick(row, ['lines', 'transactions', 'items', 'rows', 'entries']) as Row[]) ?? [];
    const lines = rawLines.map(l => this.toGlLine(l));
    const movement = lines.filter(l => !l.isOpening);
    const subTotalDebit =
      this.num(this.pick(row, ['subTotalDebit', 'totalDebit'])) ??
      movement.reduce((sum, l) => sum + l.debit, 0);
    const subTotalCredit =
      this.num(this.pick(row, ['subTotalCredit', 'totalCredit'])) ??
      movement.reduce((sum, l) => sum + l.credit, 0);
    return {
      ledgerName: String(this.pick(row, ['ledgerName', 'ledger', 'name', 'account']) ?? ''),
      lines,
      subTotalDebit,
      subTotalCredit,
      hasSubTotal: movement.length > 1,
    };
  }

  private toGlLine(row: Row): GeneralLedgerLine {
    const narration = String(
      this.pick(row, ['narration', 'remarks', 'description', 'particulars']) ?? '',
    );
    const isOpening =
      this.truthy(this.pick(row, ['isOpening', 'opening'])) || /^\s*opening/i.test(narration);
    const balance = this.toBalance(this.pick(row, ['balance', 'runningBalance', 'closingBalance']));
    return {
      date: String(this.pick(row, ['date', 'voucherDate', 'vDate', 'transactionDate']) ?? ''),
      voucherNo: String(this.pick(row, ['voucherNo', 'vchNo', 'voucherId', 'vNo', 'code']) ?? ''),
      narration,
      shortNarration: String(this.pick(row, ['shortNarration', 'shortNote', 'narrationShort']) ?? ''),
      debit: this.num(this.pick(row, ['debit', 'dr', 'debitAmount', 'drAmount'])) ?? 0,
      credit: this.num(this.pick(row, ['credit', 'cr', 'creditAmount', 'crAmount'])) ?? 0,
      balance: balance.balance,
      balanceSide: balance.side,
      isOpening,
    };
  }

  /** Group closing balance: prefer an API value, else sum each account's final running balance. */
  private glGroupClosing(row: Row, accounts: GeneralLedgerAccount[]): { balance: number; side: BalanceSide } {
    const apiVal = this.pick(row, ['closingBalance', 'balance', 'summaryBalance']);
    if (apiVal != null) return this.toBalance(apiVal);
    let signed = 0;
    for (const account of accounts) {
      const last = account.lines[account.lines.length - 1];
      if (last) signed += last.balanceSide === 'Cr' ? -last.balance : last.balance;
    }
    return { balance: Math.abs(signed), side: signed < 0 ? 'Cr' : 'Dr' };
  }

  /**
   * Parse a running balance into a {magnitude, side} pair. Tolerates a plain
   * number (negative ⇒ Cr), a string like "1,060.00 Dr", or a {amount, side} object.
   */
  private toBalance(value: unknown): { balance: number; side: BalanceSide } {
    if (value != null && typeof value === 'object') {
      const obj = value as Row;
      const amount = this.num(this.pick(obj, ['amount', 'balance', 'value'])) ?? 0;
      const side = this.balanceSide(this.pick(obj, ['side', 'drcr', 'type']));
      return { balance: Math.abs(amount), side: side || (amount < 0 ? 'Cr' : 'Dr') };
    }
    if (typeof value === 'string') {
      const num = this.num(value.replace(/[^0-9.-]/g, '')) ?? 0;
      const side = this.balanceSide(value) || (num < 0 ? 'Cr' : 'Dr');
      return { balance: Math.abs(num), side };
    }
    const num = this.num(value);
    if (num == null) return { balance: 0, side: '' };
    return { balance: Math.abs(num), side: num < 0 ? 'Cr' : 'Dr' };
  }

  /** Extract a Dr/Cr side from a value, or '' when neither is present. */
  private balanceSide(value: unknown): BalanceSide {
    const match = String(value ?? '').match(/\b(dr|cr)\b/i);
    if (!match) return '';
    return match[1].toLowerCase() === 'cr' ? 'Cr' : 'Dr';
  }

  /** Loose truthiness for API flags that may arrive as boolean, number or string. */
  private truthy(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return ['true', '1', 'yes', 'y'].includes(value.trim().toLowerCase());
    return false;
  }

  private normalizeStatement(data: unknown, query: ReceiptPaymentQuery): ReceiptPaymentStatement {
    const root = (data ?? {}) as Row;
    return {
      companyName: String(
        this.pick(root, ['companyName', 'company', 'companyTitle']) ?? environment.companyName,
      ),
      title: String(this.pick(root, ['title']) ?? 'Receipt & Payment Statement'),
      option: String(this.pick(root, ['option']) ?? ''),
      fromDate: String(this.pick(root, ['fromDate', 'dateFrom', 'startDate']) ?? query.fromDate),
      toDate: String(this.pick(root, ['toDate', 'dateTo', 'endDate']) ?? query.toDate),
      openingCashBank: this.toSection(this.pick(root, ['openingCashBank']) as Row, 'A. Opening Cash & Bank'),
      receiptPayment: this.toSection(this.pick(root, ['receiptPayment']) as Row, 'B. Receipt & Payment'),
      closingCashBank: this.toSection(this.pick(root, ['closingCashBank']) as Row, 'C. Closing Cash & Bank'),
      grandTotalReceipt: this.num(this.pick(root, ['grandTotalReceipt', 'totalReceipt'])) ?? 0,
      grandTotalPayment: this.num(this.pick(root, ['grandTotalPayment', 'totalPayment'])) ?? 0,
    };
  }

  private toSection(row: Row | null | undefined, defaultTitle: string): RpsSection {
    const section = (row ?? {}) as Row;
    const rawGroups = (this.pick(section, ['groups', 'items', 'rows']) as Row[]) ?? [];
    return {
      sectionTitle: String(this.pick(section, ['sectionTitle', 'title']) ?? defaultTitle),
      groups: rawGroups.map(g => this.toGroup(g)),
      summaryReceipt: this.num(this.pick(section, ['summaryReceipt', 'totalReceipt'])) ?? 0,
      summaryPayment: this.num(this.pick(section, ['summaryPayment', 'totalPayment'])) ?? 0,
    };
  }

  private toGroup(row: Row): RpsGroup {
    const rawLines = (this.pick(row, ['lines', 'items', 'rows', 'ledgers']) as Row[]) ?? [];
    const lines = rawLines.map(l => this.toRpsLine(l));
    return {
      groupName: String(this.pick(row, ['groupName', 'name', 'group']) ?? ''),
      lines,
      subTotalReceipt:
        this.num(this.pick(row, ['subTotalReceipt'])) ?? lines.reduce((a, l) => a + l.receipt, 0),
      subTotalPayment:
        this.num(this.pick(row, ['subTotalPayment'])) ?? lines.reduce((a, l) => a + l.payment, 0),
    };
  }

  private toRpsLine(row: Row): RpsLine {
    return {
      ledger: String(this.pick(row, ['ledger', 'ledgerName', 'name', 'account']) ?? ''),
      receipt: this.num(this.pick(row, ['receipt', 'receiptAmount', 'debit', 'dr'])) ?? 0,
      payment: this.num(this.pick(row, ['payment', 'paymentAmount', 'credit', 'cr'])) ?? 0,
    };
  }

  private fetch(endpoint: string, query: ReportDateQuery, kind: BookKind): Observable<CashBookReport> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/${endpoint}`, query)
      .pipe(map(res => this.normalize(res?.data, query, kind)));
  }

  /**
   * Reshape the (loosely-typed) API payload into a {@link CashBookReport}. The
   * report endpoints aren't strongly specified, so we read each field from a
   * set of likely aliases and fall back to computing totals client-side. The
   * payload may be either a flat array of rows or an object that already groups
   * opening / transactions / closing.
   */
  private normalize(data: unknown, query: ReportDateQuery, kind: BookKind): CashBookReport {
    const root = (data ?? {}) as Row;

    const companyName = String(
      this.pick(root, ['companyName', 'company', 'companyTitle']) ?? environment.companyName,
    );
    const fromDate = String(this.pick(root, ['fromDate', 'dateFrom', 'startDate']) ?? query.fromDate);
    const toDate = String(this.pick(root, ['toDate', 'dateTo', 'endDate']) ?? query.toDate);

    // Locate the transaction rows wherever the API parked them.
    const rawRows = Array.isArray(data)
      ? (data as Row[])
      : (this.pick(root, ['transactions', 'items', 'details', 'rows', 'lines', 'data']) as Row[]) ?? [];

    // Some payloads tag opening/closing inside the same rows array; split those
    // out so they render in their own sections rather than as transactions.
    const openingSubject = kind === 'cash' ? 'Cash' : 'Bank';
    const openingRaw = this.pick(root, ['opening', 'openingBalance', 'openingCash', 'openingBank']);
    const openingRows = Array.isArray(openingRaw)
      ? (openingRaw as Row[])
      : openingRaw != null
        ? [openingRaw as Row]
        : rawRows.filter(r => this.isSection(r, 'open'));
    const opening = openingRows
      .map(r => this.toLine(r, openingSubject))
      .filter((l): l is CashBookLine => l !== null);
    const closingSubject = kind === 'cash' ? 'Cash' : 'Bank';
    const closingRaw = this.pick(root, ['closing', 'closingBalance', 'closingCash', 'closingBank']);
    const closingRows = Array.isArray(closingRaw)
      ? (closingRaw as Row[])
      : closingRaw != null
        ? [closingRaw as Row]
        : rawRows.filter(r => this.isSection(r, 'clos'));
    const closing = closingRows
      .map(r => this.toLine(r, closingSubject))
      .filter((l): l is CashBookLine => l !== null);

    const transactions = rawRows
      .filter(r => !this.isSection(r, 'open') && !this.isSection(r, 'clos'))
      .map(r => this.toLine(r, ''))
      .filter((l): l is CashBookLine => l !== null);

    const subTotalReceipt = this.sum(root, ['subTotalReceipt', 'subTotalReceipt'], transactions, 'receipt');
    const subTotalPayment = this.sum(root, ['subTotalPayment'], transactions, 'payment');

    const grandTotalReceipt =
      this.num(this.pick(root, ['grandTotalReceipt', 'totalReceipt'])) ??
      opening.reduce((acc, l) => acc + l.receipt, 0) + subTotalReceipt;
    const grandTotalPayment =
      this.num(this.pick(root, ['grandTotalPayment', 'totalPayment'])) ??
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

  private toLine(row: Row | null, defaultLedger: string): CashBookLine | null {
    if (!row) return null;
    return {
      date: String(this.pick(row, ['date', 'voucherDate', 'vDate', 'transactionDate']) ?? ''),
      voucherId: String(this.pick(row, ['voucherNo', 'voucherId', 'id', 'vNo', 'code']) ?? ''),
      reference: String(this.pick(row, ['reference', 'ref', 'refNo']) ?? ''),
      ledger: String(this.pick(row, ['ledger', 'ledgerName', 'name', 'account']) ?? defaultLedger),
      narration: String(this.pick(row, ['narration', 'remarks', 'description', 'particulars']) ?? ''),
      receipt: this.num(this.pick(row, ['receipt', 'receiptAmount', 'debit', 'dr', 'inflow'])) ?? 0,
      payment: this.num(this.pick(row, ['payment', 'paymentAmount', 'credit', 'cr', 'outflow'])) ?? 0,
    };
  }

  /** First defined value among the given keys (case-insensitive). */
  private pick(row: Row, keys: string[]): unknown {
    for (const key of keys) {
      if (row[key] != null) return row[key];
      const found = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
      if (found && row[found] != null) return row[found];
    }
    return undefined;
  }

  /** Whether a row is tagged as the opening/closing section (by a marker field). */
  private isSection(row: Row, marker: string): boolean {
    const tag = String(this.pick(row, ['section', 'type', 'group', 'rowType']) ?? '').toLowerCase();
    return tag.includes(marker);
  }

  private sum(root: Row, keys: string[], lines: CashBookLine[], field: 'receipt' | 'payment'): number {
    const given = this.num(this.pick(root, keys));
    if (given != null) return given;
    return lines.reduce((acc, l) => acc + l[field], 0);
  }

  private num(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
}
