import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuService } from '../../services/menu-service';
import { UserService } from '../../services/user-service';
import { ChartOfAccountService } from '../../services/chart-of-account-service';
import { AuthService } from '../../services/auth-service';
import { ReportService } from '../../services/report-service';
import { environment } from '../../../environments/environment';
import { CountUp } from '../../components/shared/count-up/count-up';
import {
  BalanceSheetReport,
  ReceiptPaymentStatement,
  TrialBalanceReport,
  TrialBalanceTotals,
} from '../../models/report.model';

/** A KPI tile on the top row. */
interface Kpi {
  label: string;
  value: number;
  caption: string;
  icon: string;
  /** Tailwind gradient classes for the icon chip. */
  gradient: string;
  /** Tailwind text-colour class for the trend caption. */
  tone: string;
}

/** One slice of the nature-distribution donut, with precomputed SVG geometry. */
interface DonutSlice {
  label: string;
  value: number;
  color: string;
  percent: number;
  dash: string;
  offset: number;
}

/** A horizontal comparison bar. */
interface Bar {
  label: string;
  value: number;
  percent: number;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CountUp],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private menuService = inject(MenuService);
  private userService = inject(UserService);
  private accountService = inject(ChartOfAccountService);
  private reportService = inject(ReportService);
  private auth = inject(AuthService);

  protected readonly user = this.auth.currentUser;

  /** Circumference of the donut ring (r = 54). */
  private readonly circumference = 2 * Math.PI * 54;

  protected readonly fromDate = this.startOfYear();
  protected readonly toDate = this.today();

  // ---- Entity counts ------------------------------------------------------
  protected readonly menuCount = signal<number | null>(null);
  protected readonly userCount = signal<number | null>(null);
  protected readonly accountCount = signal<number | null>(null);

  // ---- Financial reports --------------------------------------------------
  private readonly trialBalance = signal<TrialBalanceReport | null>(null);
  private readonly balanceSheet = signal<BalanceSheetReport | null>(null);
  private readonly receiptPayment = signal<ReceiptPaymentStatement | null>(null);
  protected readonly loadingFinance = signal(true);

  // ---- Derived figures ----------------------------------------------------
  protected readonly totalAssets = computed(() => this.balanceSheet()?.assets.summary ?? 0);
  protected readonly totalLiabilities = computed(() => this.balanceSheet()?.liabilities.summary ?? 0);
  protected readonly isBalanced = computed(() => this.balanceSheet()?.isBalanced ?? false);

  protected readonly income = computed(() => this.natureNet('Income'));
  protected readonly expense = computed(() => this.natureNet('Expense'));
  protected readonly netProfit = computed(() => this.income() - this.expense());

  protected readonly receipts = computed(() => this.receiptPayment()?.grandTotalReceipt ?? 0);
  protected readonly payments = computed(() => this.receiptPayment()?.grandTotalPayment ?? 0);
  protected readonly netCashFlow = computed(() => this.receipts() - this.payments());

  protected readonly kpis = computed<Kpi[]>(() => [
    {
      label: 'Total Assets',
      value: this.totalAssets(),
      caption: this.isBalanced() ? 'Balance sheet is balanced' : 'As on today',
      icon: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 6h16M12 10v10',
      gradient: 'from-indigo-500 to-violet-600',
      tone: this.isBalanced() ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500',
    },
    {
      label: 'Total Income',
      value: this.income(),
      caption: 'Year to date',
      icon: 'M3 17l6-6 4 4 7-7M14 7h7v7',
      gradient: 'from-emerald-500 to-teal-600',
      tone: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Total Expense',
      value: this.expense(),
      caption: 'Year to date',
      icon: 'M3 7l6 6 4-4 7 7M14 17h7v-7',
      gradient: 'from-amber-500 to-orange-600',
      tone: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Net Profit',
      value: Math.abs(this.netProfit()),
      caption: this.netProfit() >= 0 ? 'Surplus' : 'Deficit',
      icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
      gradient: this.netProfit() >= 0 ? 'from-sky-500 to-indigo-600' : 'from-rose-500 to-red-600',
      tone: this.netProfit() >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400',
    },
  ]);

  /** Account-nature distribution donut (Asset / Liability / Income / Expense). */
  protected readonly donut = computed<DonutSlice[]>(() => {
    const palette: Record<string, string> = {
      Asset: '#6366f1',
      Liability: '#f43f5e',
      Income: '#10b981',
      Expense: '#f59e0b',
    };
    const raw = (this.trialBalance()?.sections ?? [])
      .map(s => {
        const key = Object.keys(palette).find(k => s.nature.toLowerCase().includes(k.toLowerCase()));
        return { label: key ?? s.nature, value: this.netOf(s.total), color: palette[key ?? ''] ?? '#8b5cf6' };
      })
      .filter(s => s.value > 0);

    const total = raw.reduce((sum, s) => sum + s.value, 0);
    let acc = 0;
    return raw.map(s => {
      const frac = total > 0 ? s.value / total : 0;
      const len = frac * this.circumference;
      const slice: DonutSlice = {
        ...s,
        percent: Math.round(frac * 100),
        dash: `${len} ${this.circumference - len}`,
        offset: -acc,
      };
      acc += len;
      return slice;
    });
  });

  protected readonly donutTotal = computed(() => this.donut().reduce((sum, s) => sum + s.value, 0));

  /** Income vs Expense comparison columns. */
  protected readonly incomeExpenseBars = computed<Bar[]>(() => {
    const inc = this.income();
    const exp = this.expense();
    const max = Math.max(inc, exp, 1);
    return [
      { label: 'Income', value: inc, percent: (inc / max) * 100, color: '#10b981' },
      { label: 'Expense', value: exp, percent: (exp / max) * 100, color: '#f59e0b' },
    ];
  });

  /** Receipts vs Payments cash-flow bars. */
  protected readonly cashFlowBars = computed<Bar[]>(() => {
    const rec = this.receipts();
    const pay = this.payments();
    const max = Math.max(rec, pay, 1);
    return [
      { label: 'Receipts', value: rec, percent: (rec / max) * 100, color: '#0ea5e9' },
      { label: 'Payments', value: pay, percent: (pay / max) * 100, color: '#f43f5e' },
    ];
  });

  /** Top account groups by closing balance, across every nature section. */
  protected readonly topGroups = computed<Bar[]>(() => {
    const palette = ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e'];
    const groups = (this.trialBalance()?.sections ?? [])
      .flatMap(s => s.groups)
      .map(g => ({ label: g.groupName || 'Ungrouped', value: this.netOf(g.subTotal) }))
      .filter(g => g.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const max = groups[0]?.value ?? 1;
    return groups.map((g, i) => ({ ...g, percent: (g.value / max) * 100, color: palette[i % palette.length] }));
  });

  protected readonly entityCards = computed(() => [
    {
      label: 'Chart of Accounts',
      value: this.accountCount(),
      link: '/chart-of-account',
      gradient: 'from-blue-500 to-indigo-600',
      icon: 'M3 3v18h18M8 17V9m4 8V5m4 12v-6',
    },
    {
      label: 'Active Users',
      value: this.userCount(),
      link: '/user-list',
      gradient: 'from-emerald-500 to-teal-600',
      icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    },
    {
      label: 'Menus',
      value: this.menuCount(),
      link: '/menu-list',
      gradient: 'from-violet-500 to-fuchsia-600',
      icon: 'M4 6h16M4 12h16M4 18h16',
    },
  ]);

  constructor() {
    this.loadCounts();
    this.loadFinance();
  }

  private loadCounts(): void {
    this.menuService.search({}).subscribe({
      next: data => this.menuCount.set(data?.length ?? 0),
      error: () => this.menuCount.set(0),
    });
    this.userService.search({ companyID: environment.companyCode }).subscribe({
      next: data => this.userCount.set(data?.length ?? 0),
      error: () => this.userCount.set(0),
    });
    this.accountService.search({}).subscribe({
      next: data => this.accountCount.set(data?.length ?? 0),
      error: () => this.accountCount.set(0),
    });
  }

  private loadFinance(): void {
    const range = { fromDate: this.fromDate, toDate: this.toDate };

    // Clear the loading flag once all three reports have settled (success or
    // failure), so the skeletons never get stuck if the API is unreachable.
    let pending = 3;
    const settle = () => {
      if (--pending === 0) this.loadingFinance.set(false);
    };

    this.reportService.trialBalance(range).subscribe({
      next: report => this.trialBalance.set(report),
      error: () => {
        this.trialBalance.set(null);
        settle();
      },
      complete: settle,
    });

    this.reportService.balanceSheet({ asOfDate: this.toDate, fiscalYearStart: this.fromDate }).subscribe({
      next: report => this.balanceSheet.set(report),
      error: () => {
        this.balanceSheet.set(null);
        settle();
      },
      complete: settle,
    });

    this.reportService.receiptPaymentStatement(range).subscribe({
      next: report => this.receiptPayment.set(report),
      error: () => {
        this.receiptPayment.set(null);
        settle();
      },
      complete: settle,
    });
  }

  /** Net closing magnitude (|debit − credit|) for a Trial Balance section/group. */
  private netOf(totals: TrialBalanceTotals): number {
    return Math.abs(totals.closing.debit - totals.closing.credit);
  }

  /** Net closing magnitude for the section whose nature matches `name`. */
  private natureNet(name: string): number {
    const section = (this.trialBalance()?.sections ?? []).find(s =>
      s.nature.toLowerCase().includes(name.toLowerCase()),
    );
    return section ? this.netOf(section.total) : 0;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private startOfYear(): string {
    return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  }
}
