import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { usePermissions } from '../../src/hooks/usePermissions';
import { spacing } from '../../src/config/theme';
import { ledgerService } from '../../src/services/ledger';
import { chartOfAccountService } from '../../src/services/chart-of-account';
import { Ledger } from '../../src/models/ledger';
import { confirm, errMessage, notify } from '../../src/lib/alerts';
import { money } from '../../src/lib/format';
import { ListHeader } from '../../src/components/ListHeader';
import { Card, T, Badge, EmptyState } from '../../src/components/ui/layout';
import { Icon } from '../../src/components/ui/Icon';
import { FormSheet } from '../../src/components/ui/FormSheet';
import { TextField, NumberField, SwitchField, Select, Option } from '../../src/components/ui/form';

const empty: Ledger = {
  groupId: 0,
  ledgerName: '',
  address: '',
  phone: '',
  email: '',
  drOpeningBalance: 0,
  crOpeningBalance: 0,
  note: '',
  isActive: true,
};

export default function LedgerScreen() {
  const { palette } = useTheme();
  const perms = usePermissions();
  const menu = 'Ledger';

  const [items, setItems] = useState<Ledger[]>([]);
  const [groups, setGroups] = useState<Option<number>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Ledger>(empty);

  const load = useCallback(async () => {
    try {
      const [ledgers, accounts] = await Promise.all([
        ledgerService.search({ search: search.trim() || null }),
        chartOfAccountService.search({ onlyLeaf: true }),
      ]);
      setItems(ledgers.items);
      setGroups(accounts.filter((a) => a.id != null).map((a) => ({ label: `${a.name}${a.code ? ` (${a.code})` : ''}`, value: a.id! })));
    } catch (err) {
      notify('Error', errMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((l) => l.ledgerName.toLowerCase().includes(q) || (l.code ?? '').toLowerCase().includes(q));
  }, [items, search]);

  const save = async () => {
    if (!draft.ledgerName.trim() || !draft.groupId) {
      notify('Required', 'Ledger name and group are required.');
      return;
    }
    setSaving(true);
    try {
      if (draft.id) await ledgerService.update(draft.id, draft);
      else await ledgerService.add(draft);
      setSheet(false);
      await load();
    } catch (err) {
      notify('Save failed', errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (l: Ledger) => {
    if (!l.id || !(await confirm('Delete ledger', `Delete "${l.ledgerName}"?`))) return;
    try {
      await ledgerService.delete(l.id);
      await load();
    } catch (err) {
      notify('Delete failed', errMessage(err));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, padding: spacing.lg }}>
      <ListHeader
        search={search}
        onSearch={setSearch}
        onSubmit={load}
        onAdd={() => {
          setDraft(empty);
          setSheet(true);
        }}
        canAdd={perms.canCreate(menu)}
        placeholder="Search ledgers…"
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
        renderItem={({ item }) => (
          <Pressable onPress={() => perms.canEdit(menu) && (setDraft({ ...item }), setSheet(true))}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <T size={15} weight="700">
                    {item.ledgerName}
                  </T>
                  <T muted size={12} style={{ marginTop: 2 }}>
                    {item.code ?? '—'}
                    {item.groupName ? ` · ${item.groupName}` : ''}
                  </T>
                  {item.drOpeningBalance || item.crOpeningBalance ? (
                    <T muted size={12} style={{ marginTop: 2 }}>
                      Opening: {item.drOpeningBalance ? `${money(item.drOpeningBalance)} Dr` : `${money(item.crOpeningBalance)} Cr`}
                    </T>
                  ) : null}
                </View>
                <Badge label={item.isActive ? 'Active' : 'Inactive'} tone={item.isActive ? 'success' : 'neutral'} />
                {perms.canDelete(menu) ? (
                  <Pressable onPress={() => remove(item)} hitSlop={8} style={{ marginLeft: spacing.md }}>
                    <Icon path="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" size={18} color={palette.danger} />
                  </Pressable>
                ) : null}
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={loading ? null : <EmptyState title="No ledgers" message="Add a ledger to get started." />}
      />

      <FormSheet
        visible={sheet}
        title={draft.id ? 'Edit Ledger' : 'New Ledger'}
        onClose={() => setSheet(false)}
        onSave={save}
        saving={saving}
      >
        <TextField label="Ledger Name" value={draft.ledgerName} onChangeText={(v) => setDraft({ ...draft, ledgerName: v })} />
        <Select
          label="Group (Account)"
          value={draft.groupId || null}
          options={groups}
          onChange={(v) => setDraft({ ...draft, groupId: v })}
          searchable
          placeholder="Select group"
        />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <NumberField label="Dr Opening" value={draft.drOpeningBalance} onChangeValue={(v) => setDraft({ ...draft, drOpeningBalance: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField label="Cr Opening" value={draft.crOpeningBalance} onChangeValue={(v) => setDraft({ ...draft, crOpeningBalance: v })} />
          </View>
        </View>
        <TextField label="Address" value={draft.address ?? ''} onChangeText={(v) => setDraft({ ...draft, address: v })} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <TextField label="Phone" value={draft.phone ?? ''} onChangeText={(v) => setDraft({ ...draft, phone: v })} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Email" value={draft.email ?? ''} onChangeText={(v) => setDraft({ ...draft, email: v })} keyboardType="email-address" autoCapitalize="none" />
          </View>
        </View>
        <TextField label="Note" value={draft.note ?? ''} onChangeText={(v) => setDraft({ ...draft, note: v })} multiline />
        <SwitchField label="Active" value={draft.isActive} onValueChange={(v) => setDraft({ ...draft, isActive: v })} />
      </FormSheet>
    </View>
  );
}
