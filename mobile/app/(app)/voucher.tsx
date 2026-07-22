import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { usePermissions } from '../../src/hooks/usePermissions';
import { spacing, radius } from '../../src/config/theme';
import { voucherService } from '../../src/services/voucher';
import { Voucher, VOUCHER_TYPES } from '../../src/models/voucher';
import { confirm, errMessage, notify } from '../../src/lib/alerts';
import { money, formatDate, todayIso, toIsoDate } from '../../src/lib/format';
import { ListHeader } from '../../src/components/ListHeader';
import { Card, T, Badge, EmptyState } from '../../src/components/ui/layout';
import { Button } from '../../src/components/ui/Button';
import { Icon } from '../../src/components/ui/Icon';
import { Select, DateField } from '../../src/components/ui/form';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toIsoDate(d);
}

const amountOf = (v: Voucher) =>
  v.totalDebit != null ? v.totalDebit : v.amount != null ? v.amount : (v.details ?? []).reduce((s, d) => s + (Number(d.debit) || 0), 0);

export default function VoucherScreen() {
  const { palette } = useTheme();
  const perms = usePermissions();
  const router = useRouter();
  const menu = 'Voucher';

  const [items, setItems] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState(daysAgo(6));
  const [toDate, setToDate] = useState(todayIso());
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await voucherService.search({
        type: typeFilter || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
      });
      setItems(res.items);
    } catch (err) {
      notify('Error', errMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter, fromDate, toDate]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((v) =>
      [v.voucherNo, v.reference, v.narration, v.type].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [items, search]);

  const total = filtered.reduce((s, v) => s + amountOf(v), 0);

  const remove = async (v: Voucher) => {
    if (v.id == null || !(await confirm('Delete voucher', v.voucherNo ? `Delete voucher "${v.voucherNo}"?` : 'Delete this voucher?'))) return;
    try {
      await voucherService.delete(v.id);
      await load();
    } catch (err) {
      notify('Delete failed', errMessage(err));
    }
  };

  const typeOptions = [{ label: 'All types', value: '' }, ...VOUCHER_TYPES.map((t) => ({ label: `${t.code} — ${t.label}`, value: t.code }))];

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, padding: spacing.lg }}>
      <ListHeader
        search={search}
        onSearch={setSearch}
        onAdd={perms.canCreate(menu) ? () => router.push('/voucher-entry' as never) : undefined}
        canAdd={perms.canCreate(menu)}
        placeholder="Search vouchers…"
        addLabel="New"
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Pressable
          onPress={() => setShowFilters((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Icon path="M3 4h18l-7 8v6l-4 2v-8L3 4Z" size={16} color={palette.primary} />
          <T size={13} weight="700" color={palette.primary}>
            Filters
          </T>
        </Pressable>
        <View style={{ flex: 1 }} />
        <T muted size={12}>
          {filtered.length} vouchers · {money(total)}
        </T>
      </View>

      {showFilters ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Select label="Type" value={typeFilter} options={typeOptions} onChange={setTypeFilter} />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <DateField label="From" value={fromDate} onChange={setFromDate} />
            </View>
            <View style={{ flex: 1 }}>
              <DateField label="To" value={toDate} onChange={setToDate} />
            </View>
          </View>
          <Button label="Apply" onPress={load} full />
        </Card>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item, i) => String(item.id ?? i)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={palette.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => perms.canEdit(menu) && item.id != null && router.push(`/voucher-entry?id=${item.id}` as never)}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, backgroundColor: palette.primarySoft, marginRight: spacing.sm }}>
                  <T size={12} weight="800" color={palette.primary}>
                    {item.type}
                  </T>
                </View>
                <T size={14} weight="700" style={{ flex: 1 }}>
                  {item.voucherNo ?? 'Voucher'}
                </T>
                <T size={15} weight="800">
                  {money(amountOf(item))}
                </T>
              </View>
              <T muted size={12}>
                {formatDate(item.voucherDate)}
                {item.reference ? ` · Ref: ${item.reference}` : ''}
              </T>
              {item.narration ? (
                <T muted size={12} numberOfLines={1} style={{ marginTop: 2 }}>
                  {item.narration}
                </T>
              ) : null}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <Button label="Print" size="sm" variant="secondary" icon="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8Z" onPress={() => item.id != null && router.push(`/voucher-print?id=${item.id}` as never)} />
                {perms.canDelete(menu) ? <Button label="Delete" size="sm" variant="danger" onPress={() => remove(item)} /> : null}
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={loading ? null : <EmptyState title="No vouchers" message="Adjust filters or create a voucher." />}
      />
    </View>
  );
}
