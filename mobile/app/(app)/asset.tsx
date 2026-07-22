import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { usePermissions } from '../../src/hooks/usePermissions';
import { spacing } from '../../src/config/theme';
import { assetService } from '../../src/services/asset';
import { ledgerService } from '../../src/services/ledger';
import { Asset, DisposeAssetRequest } from '../../src/models/asset';
import { confirm, errMessage, notify } from '../../src/lib/alerts';
import { money, formatDate, todayIso } from '../../src/lib/format';
import { ListHeader } from '../../src/components/ListHeader';
import { Card, T, Badge, EmptyState, KeyValue, Divider } from '../../src/components/ui/layout';
import { Button } from '../../src/components/ui/Button';
import { FormSheet } from '../../src/components/ui/FormSheet';
import { TextField, NumberField, SwitchField, Select, DateField, Option } from '../../src/components/ui/form';

const empty: Asset = {
  assetName: '',
  category: '',
  location: '',
  serialNo: '',
  assetLedgerId: 0,
  accumulatedDepLedgerId: 0,
  depExpenseLedgerId: 0,
  purchaseDate: todayIso(),
  depreciationStartDate: todayIso(),
  cost: 0,
  salvageValue: 0,
  method: 'SL',
  usefulLifeMonths: 60,
  ratePercent: 0,
  note: '',
  isActive: true,
};

const emptyDispose: DisposeAssetRequest = {
  disposalDate: todayIso(),
  disposalAmount: 0,
  receivedInLedgerId: 0,
  gainLossLedgerId: 0,
  depreciateUpToDisposal: true,
};

export default function AssetScreen() {
  const { palette } = useTheme();
  const perms = usePermissions();
  const menu = 'Asset';

  const [items, setItems] = useState<Asset[]>([]);
  const [ledgers, setLedgers] = useState<Option<number>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Asset>(empty);
  const [disposeFor, setDisposeFor] = useState<Asset | null>(null);
  const [disposeDraft, setDisposeDraft] = useState<DisposeAssetRequest>(emptyDispose);

  const load = useCallback(async () => {
    try {
      const [assets, ledgerList] = await Promise.all([assetService.search({}), ledgerService.searchList({})]);
      setItems(assets);
      setLedgers(ledgerList.items.filter((l) => l.id != null).map((l) => ({ label: l.ledgerName, value: l.id! })));
    } catch (err) {
      notify('Error', errMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) => a.assetName.toLowerCase().includes(q) || (a.category ?? '').toLowerCase().includes(q));
  }, [items, search]);

  const save = async () => {
    if (!draft.assetName.trim() || !draft.assetLedgerId) {
      notify('Required', 'Asset name and asset ledger are required.');
      return;
    }
    setSaving(true);
    try {
      if (draft.id) await assetService.update(draft.id, draft);
      else await assetService.add(draft);
      setSheet(false);
      await load();
    } catch (err) {
      notify('Save failed', errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: Asset) => {
    if (!a.id || !(await confirm('Delete asset', `Delete "${a.assetName}"?`))) return;
    try {
      await assetService.delete(a.id);
      await load();
    } catch (err) {
      notify('Delete failed', errMessage(err));
    }
  };

  const runDepreciation = async (a: Asset) => {
    if (!a.id || !(await confirm('Run depreciation', `Post depreciation for "${a.assetName}" up to today?`, 'Run'))) return;
    try {
      await assetService.runDepreciation({ asOfDate: todayIso(), assetId: a.id });
      notify('Done', 'Depreciation posted.');
      await load();
    } catch (err) {
      notify('Failed', errMessage(err));
    }
  };

  const saveDispose = async () => {
    if (!disposeFor?.id) return;
    if (!disposeDraft.receivedInLedgerId || !disposeDraft.gainLossLedgerId) {
      notify('Required', 'Received-in and gain/loss ledgers are required.');
      return;
    }
    setSaving(true);
    try {
      await assetService.dispose(disposeFor.id, disposeDraft);
      setDisposeFor(null);
      await load();
    } catch (err) {
      notify('Dispose failed', errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, padding: spacing.lg }}>
      <ListHeader
        search={search}
        onSearch={setSearch}
        onAdd={() => {
          setDraft(empty);
          setSheet(true);
        }}
        canAdd={perms.canCreate(menu)}
        placeholder="Search assets…"
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
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
        renderItem={({ item }) => {
          const disposed = String(item.status ?? '').toLowerCase() === 'disposed';
          return (
            <Card>
              <Pressable onPress={() => perms.canEdit(menu) && !disposed && (setDraft({ ...item }), setSheet(true))}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <T size={15} weight="700">
                      {item.assetName}
                    </T>
                    <T muted size={12} style={{ marginTop: 2 }}>
                      {item.category || 'Uncategorised'} · {item.method === 'WDV' ? 'Reducing balance' : 'Straight line'}
                    </T>
                  </View>
                  <Badge label={disposed ? 'Disposed' : 'Active'} tone={disposed ? 'danger' : 'success'} />
                </View>
                <Divider />
                <KeyValue label="Cost" value={money(item.cost)} />
                {item.accumulatedDepreciation != null ? <KeyValue label="Accum. Depreciation" value={money(item.accumulatedDepreciation)} /> : null}
                {item.netBookValue != null ? <KeyValue label="Net Book Value" value={money(item.netBookValue)} /> : null}
                <KeyValue label="Purchased" value={formatDate(item.purchaseDate)} />
              </Pressable>
              {!disposed ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' }}>
                  {perms.canEdit(menu) ? <Button label="Depreciate" size="sm" variant="secondary" onPress={() => runDepreciation(item)} /> : null}
                  {perms.canEdit(menu) ? (
                    <Button
                      label="Dispose"
                      size="sm"
                      variant="secondary"
                      onPress={() => {
                        setDisposeDraft(emptyDispose);
                        setDisposeFor(item);
                      }}
                    />
                  ) : null}
                  {perms.canDelete(menu) ? <Button label="Delete" size="sm" variant="danger" onPress={() => remove(item)} /> : null}
                </View>
              ) : null}
            </Card>
          );
        }}
        ListEmptyComponent={loading ? null : <EmptyState title="No assets" message="Register a fixed asset to get started." />}
      />

      {/* Add / edit */}
      <FormSheet visible={sheet} title={draft.id ? 'Edit Asset' : 'New Asset'} onClose={() => setSheet(false)} onSave={save} saving={saving}>
        <TextField label="Asset Name" value={draft.assetName} onChangeText={(v) => setDraft({ ...draft, assetName: v })} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <TextField label="Category" value={draft.category ?? ''} onChangeText={(v) => setDraft({ ...draft, category: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Location" value={draft.location ?? ''} onChangeText={(v) => setDraft({ ...draft, location: v })} />
          </View>
        </View>
        <TextField label="Serial No" value={draft.serialNo ?? ''} onChangeText={(v) => setDraft({ ...draft, serialNo: v })} />
        <Select label="Asset Ledger" value={draft.assetLedgerId || null} options={ledgers} onChange={(v) => setDraft({ ...draft, assetLedgerId: v })} searchable placeholder="Select ledger" />
        <Select label="Accumulated Dep. Ledger" value={draft.accumulatedDepLedgerId || null} options={ledgers} onChange={(v) => setDraft({ ...draft, accumulatedDepLedgerId: v })} searchable placeholder="Select ledger" />
        <Select label="Dep. Expense Ledger" value={draft.depExpenseLedgerId || null} options={ledgers} onChange={(v) => setDraft({ ...draft, depExpenseLedgerId: v })} searchable placeholder="Select ledger" />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <DateField label="Purchase Date" value={draft.purchaseDate} onChange={(v) => setDraft({ ...draft, purchaseDate: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <DateField label="Dep. Start" value={draft.depreciationStartDate} onChange={(v) => setDraft({ ...draft, depreciationStartDate: v })} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <NumberField label="Cost" value={draft.cost} onChangeValue={(v) => setDraft({ ...draft, cost: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField label="Salvage Value" value={draft.salvageValue} onChangeValue={(v) => setDraft({ ...draft, salvageValue: v })} />
          </View>
        </View>
        <Select
          label="Method"
          value={draft.method}
          options={[
            { label: 'Straight Line (SL)', value: 'SL' },
            { label: 'Written Down Value (WDV)', value: 'WDV' },
          ]}
          onChange={(v) => setDraft({ ...draft, method: v as Asset['method'] })}
        />
        {draft.method === 'SL' ? (
          <NumberField label="Useful Life (months)" value={draft.usefulLifeMonths} onChangeValue={(v) => setDraft({ ...draft, usefulLifeMonths: v })} />
        ) : (
          <NumberField label="Annual Rate (%)" value={draft.ratePercent} onChangeValue={(v) => setDraft({ ...draft, ratePercent: v })} />
        )}
        <TextField label="Note" value={draft.note ?? ''} onChangeText={(v) => setDraft({ ...draft, note: v })} multiline />
        <SwitchField label="Active" value={draft.isActive} onValueChange={(v) => setDraft({ ...draft, isActive: v })} />
      </FormSheet>

      {/* Dispose */}
      <FormSheet
        visible={!!disposeFor}
        title={`Dispose ${disposeFor?.assetName ?? ''}`}
        onClose={() => setDisposeFor(null)}
        onSave={saveDispose}
        saving={saving}
        saveLabel="Dispose"
      >
        <DateField label="Disposal Date" value={disposeDraft.disposalDate} onChange={(v) => setDisposeDraft({ ...disposeDraft, disposalDate: v })} />
        <NumberField label="Disposal Amount" value={disposeDraft.disposalAmount} onChangeValue={(v) => setDisposeDraft({ ...disposeDraft, disposalAmount: v })} />
        <Select label="Received In Ledger" value={disposeDraft.receivedInLedgerId || null} options={ledgers} onChange={(v) => setDisposeDraft({ ...disposeDraft, receivedInLedgerId: v })} searchable placeholder="Cash / bank / receivable" />
        <Select label="Gain / Loss Ledger" value={disposeDraft.gainLossLedgerId || null} options={ledgers} onChange={(v) => setDisposeDraft({ ...disposeDraft, gainLossLedgerId: v })} searchable placeholder="Select ledger" />
        <SwitchField label="Depreciate up to disposal" value={disposeDraft.depreciateUpToDisposal} onValueChange={(v) => setDisposeDraft({ ...disposeDraft, depreciateUpToDisposal: v })} />
      </FormSheet>
    </View>
  );
}
