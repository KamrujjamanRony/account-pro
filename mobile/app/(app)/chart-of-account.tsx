import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { usePermissions } from '../../src/hooks/usePermissions';
import { spacing } from '../../src/config/theme';
import { chartOfAccountService } from '../../src/services/chart-of-account';
import { ACCOUNT_NATURES, ChartOfAccount } from '../../src/models/chart-of-account';
import { confirm, errMessage, notify } from '../../src/lib/alerts';
import { ListHeader } from '../../src/components/ListHeader';
import { Card, T, Badge, EmptyState } from '../../src/components/ui/layout';
import { Icon } from '../../src/components/ui/Icon';
import { FormSheet } from '../../src/components/ui/FormSheet';
import { TextField, SwitchField, Select, Option } from '../../src/components/ui/form';

const empty: ChartOfAccount = { parentId: null, name: '', nature: null, isActive: true };

export default function ChartOfAccountScreen() {
  const { palette } = useTheme();
  const perms = usePermissions();
  const menu = 'Chart of Account';

  const [items, setItems] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ChartOfAccount>(empty);

  const load = useCallback(async () => {
    try {
      setItems(await chartOfAccountService.search({}));
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
    return items.filter((c) => c.name.toLowerCase().includes(q) || (c.code ?? '').toLowerCase().includes(q));
  }, [items, search]);

  const parentOptions: Option<number>[] = useMemo(
    () => items.filter((c) => c.id != null).map((c) => ({ label: `${c.name}${c.code ? ` (${c.code})` : ''}`, value: c.id! })),
    [items],
  );
  const natureOptions: Option<string>[] = ACCOUNT_NATURES.map((n) => ({ label: n, value: n }));

  const save = async () => {
    if (!draft.name.trim()) {
      notify('Required', 'Account name is required.');
      return;
    }
    setSaving(true);
    try {
      if (draft.id) await chartOfAccountService.update(draft.id, draft);
      else await chartOfAccountService.add(draft);
      setSheet(false);
      await load();
    } catch (err) {
      notify('Save failed', errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: ChartOfAccount) => {
    if (!c.id || !(await confirm('Delete account', `Delete "${c.name}"?`))) return;
    try {
      await chartOfAccountService.delete(c.id);
      await load();
    } catch (err) {
      notify('Delete failed', errMessage(err));
    }
  };

  const isRoot = draft.parentId == null;

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
        placeholder="Search accounts…"
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
                    {item.name}
                  </T>
                  <T muted size={12} style={{ marginTop: 2 }}>
                    {item.code ?? '—'}
                    {item.nature ? ` · ${item.nature}` : ''}
                  </T>
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
        ListEmptyComponent={loading ? null : <EmptyState title="No accounts" message="Add an account to get started." />}
      />

      <FormSheet
        visible={sheet}
        title={draft.id ? 'Edit Account' : 'New Account'}
        onClose={() => setSheet(false)}
        onSave={save}
        saving={saving}
      >
        <TextField label="Account Name" value={draft.name} onChangeText={(v) => setDraft({ ...draft, name: v })} />
        <Select
          label="Parent Account"
          value={draft.parentId}
          options={parentOptions}
          onChange={(v) => setDraft({ ...draft, parentId: v })}
          searchable
          placeholder="None (root account)"
          hint="Leave as root to set an account nature."
        />
        {isRoot ? (
          <Select
            label="Nature"
            value={draft.nature ?? null}
            options={natureOptions}
            onChange={(v) => setDraft({ ...draft, nature: v })}
            placeholder="Select nature"
          />
        ) : null}
        <SwitchField label="Active" value={draft.isActive} onValueChange={(v) => setDraft({ ...draft, isActive: v })} />
      </FormSheet>
    </View>
  );
}
