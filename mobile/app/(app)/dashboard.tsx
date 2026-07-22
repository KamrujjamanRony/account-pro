import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { environment } from '../../src/config/env';
import { spacing, radius } from '../../src/config/theme';
import { menuService } from '../../src/services/menu';
import { userService } from '../../src/services/user';
import { chartOfAccountService } from '../../src/services/chart-of-account';
import { reportService } from '../../src/services/report';
import { TrialBalanceReport, BalanceSheetReport, ReceiptPaymentStatement, TrialBalanceTotals } from '../../src/models/report';
import { startOfYearIso, todayIso, compactMoney } from '../../src/lib/format';
import { Screen } from '../../src/components/ui/Screen';
import { Card, T, SectionHeader } from '../../src/components/ui/layout';
import { Icon } from '../../src/components/ui/Icon';
import { Donut, BarList } from '../../src/components/charts';

const net = (t: TrialBalanceTotals) => Math.abs(t.closing.debit - t.closing.credit);

export default function Dashboard() {
  const { palette } = useTheme();
  const router = useRouter();
  const fromDate = startOfYearIso();
  const toDate = todayIso();

  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState<{ menu: number | null; user: number | null; account: number | null }>({
    menu: null,
    user: null,
    account: null,
  });
  const [tb, setTb] = useState<TrialBalanceReport | null>(null);
  const [bs, setBs] = useState<BalanceSheetReport | null>(null);
  const [rp, setRp] = useState<ReceiptPaymentStatement | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const range = { fromDate, toDate };
    const [menu, users, accounts, trial, balance, receipt] = await Promise.allSettled([
      menuService.search({}),
      userService.search({ companyID: environment.companyCode }),
      chartOfAccountService.search({}),
      reportService.trialBalance(range),
      reportService.balanceSheet({ asOfDate: toDate, fiscalYearStart: fromDate }),
      reportService.receiptPaymentStatement(range),
    ]);
    setCounts({
      menu: menu.status === 'fulfilled' ? menu.value.length : 0,
      user: users.status === 'fulfilled' ? users.value.length : 0,
      account: accounts.status === 'fulfilled' ? accounts.value.length : 0,
    });
    setTb(trial.status === 'fulfilled' ? trial.value : null);
    setBs(balance.status === 'fulfilled' ? balance.value : null);
    setRp(receipt.status === 'fulfilled' ? receipt.value : null);
    setLoading(false);
  }, [fromDate, toDate]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const natureNet = (name: string) => {
    const section = (tb?.sections ?? []).find((s) => s.nature.toLowerCase().includes(name.toLowerCase()));
    return section ? net(section.total) : 0;
  };

  const income = natureNet('Income');
  const expense = natureNet('Expense');
  const netProfit = income - expense;
  const totalAssets = bs?.assets.summary ?? 0;
  const totalLiabilities = bs?.liabilities.summary ?? 0;
  const receipts = rp?.grandTotalReceipt ?? 0;
  const payments = rp?.grandTotalPayment ?? 0;

  const kpis = [
    { label: 'Total Assets', value: totalAssets, tone: palette.primary, icon: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 6h16M12 10v10' },
    { label: 'Total Income', value: income, tone: palette.success, icon: 'M3 17l6-6 4 4 7-7M14 7h7v7' },
    { label: 'Total Expense', value: expense, tone: palette.warning, icon: 'M3 7l6 6 4-4 7 7M14 17h7v-7' },
    { label: netProfit >= 0 ? 'Net Profit' : 'Net Loss', value: Math.abs(netProfit), tone: netProfit >= 0 ? palette.info : palette.danger, icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  ];

  const donutPalette: Record<string, string> = { Asset: '#6366f1', Liability: '#f43f5e', Income: '#10b981', Expense: '#f59e0b' };
  const donutData = (tb?.sections ?? [])
    .map((s) => {
      const key = Object.keys(donutPalette).find((k) => s.nature.toLowerCase().includes(k.toLowerCase()));
      return { label: key ?? s.nature, value: net(s.total), color: donutPalette[key ?? ''] ?? '#8b5cf6' };
    })
    .filter((s) => s.value > 0);

  const topGroups = (() => {
    const palette6 = ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e'];
    return (tb?.sections ?? [])
      .flatMap((s) => s.groups)
      .map((g) => ({ label: g.groupName || 'Ungrouped', value: net(g.subTotal) }))
      .filter((g) => g.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((g, i) => ({ ...g, color: palette6[i % palette6.length] }));
  })();

  const entityCards = [
    { label: 'Chart of Accounts', value: counts.account, link: '/chart-of-account', color: palette.primary, icon: 'M3 3v18h18M8 17V9m4 8V5m4 12v-6' },
    { label: 'Active Users', value: counts.user, link: '/user-list', color: palette.success, icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z' },
    { label: 'Menus', value: counts.menu, link: '/menu-list', color: palette.info, icon: 'M4 6h16M4 12h16M4 18h16' },
  ];

  return (
    <Screen loading={loading} onRefresh={onRefresh} refreshing={refreshing}>
      {/* KPI grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg }}>
        {kpis.map((k) => (
          <Card key={k.label} style={{ flexGrow: 1, flexBasis: '46%', minWidth: 150 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <View style={{ width: 34, height: 34, borderRadius: radius.md, backgroundColor: k.tone + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Icon path={k.icon} size={18} color={k.tone} />
              </View>
              <T muted size={12} style={{ flex: 1 }}>
                {k.label}
              </T>
            </View>
            <T size={22} weight="800">
              {compactMoney(k.value)}
            </T>
          </Card>
        ))}
      </View>

      <Card style={{ marginBottom: spacing.lg }}>
        <SectionHeader title="Account Nature" subtitle="Closing balance distribution" />
        <Donut data={donutData} centerLabel="Total" />
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
        <Card style={{ flexGrow: 1, flexBasis: '100%' }}>
          <SectionHeader title="Income vs Expense" />
          <BarList
            data={[
              { label: 'Income', value: income, color: '#10b981' },
              { label: 'Expense', value: expense, color: '#f59e0b' },
            ]}
          />
        </Card>
        <Card style={{ flexGrow: 1, flexBasis: '100%' }}>
          <SectionHeader title="Receipts vs Payments" />
          <BarList
            data={[
              { label: 'Receipts', value: receipts, color: '#0ea5e9' },
              { label: 'Payments', value: payments, color: '#f43f5e' },
            ]}
          />
        </Card>
      </View>

      <Card style={{ marginBottom: spacing.lg }}>
        <SectionHeader title="Top Account Groups" subtitle="By closing balance" />
        <BarList data={topGroups} />
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {entityCards.map((c) => (
          <Pressable
            key={c.label}
            onPress={() => router.push(c.link as never)}
            style={{ flexGrow: 1, flexBasis: '46%', minWidth: 150 }}
          >
            <Card>
              <View
                style={{ width: 34, height: 34, borderRadius: radius.md, backgroundColor: c.color + '22', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}
              >
                <Icon path={c.icon} size={18} color={c.color} />
              </View>
              <T size={24} weight="800">
                {c.value ?? '—'}
              </T>
              <T muted size={12}>
                {c.label}
              </T>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
