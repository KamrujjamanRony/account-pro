import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { usePermissions } from '../../src/hooks/usePermissions';
import { spacing } from '../../src/config/theme';
import { costCenterService } from '../../src/services/cost-center';
import { CostCenter } from '../../src/models/cost-center';
import { confirm, errMessage, notify } from '../../src/lib/alerts';
import { ListHeader } from '../../src/components/ListHeader';
import { Card, T, Badge, EmptyState } from '../../src/components/ui/layout';
import { Icon } from '../../src/components/ui/Icon';
import { FormSheet } from '../../src/components/ui/FormSheet';
import { TextField, SwitchField } from '../../src/components/ui/form';

const empty: CostCenter = { code: '', name: '', note: '', isActive: true };

export default function CostCenterScreen() {
  const { palette } = useTheme();
  const perms = usePermissions();

  const [items, setItems] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<CostCenter>(empty);

  const load = useCallback(async () => {
    try {
      setItems(await costCenterService.search({}));
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
    return items.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [items, search]);

  const openAdd = () => {
    setDraft(empty);
    setSheet(true);
  };
  const openEdit = (c: CostCenter) => {
    if (!perms.canEdit('Cost Center')) return;
    setDraft({ ...c });
    setSheet(true);
  };

  const save = async () => {
    if (!draft.code.trim() || !draft.name.trim()) {
      notify('Required', 'Code and name are required.');
      return;
    }
    setSaving(true);
    try {
      if (draft.id) await costCenterService.update(draft.id, draft);
      else await costCenterService.add(draft);
      setSheet(false);
      await load();
    } catch (err) {
      notify('Save failed', errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: CostCenter) => {
    if (!c.id || !(await confirm('Delete cost center', `Delete "${c.name}"?`))) return;
    try {
      await costCenterService.delete(c.id);
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
        onAdd={openAdd}
        canAdd={perms.canCreate('Cost Center')}
        placeholder="Search cost centers…"
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
          <Pressable onPress={() => openEdit(item)}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <T size={15} weight="700">
                    {item.name}
                  </T>
                  <T muted size={12} style={{ marginTop: 2 }}>
                    {item.code}
                    {item.note ? ` · ${item.note}` : ''}
                  </T>
                </View>
                <Badge label={item.isActive ? 'Active' : 'Inactive'} tone={item.isActive ? 'success' : 'neutral'} />
                {perms.canDelete('Cost Center') ? (
                  <Pressable onPress={() => remove(item)} hitSlop={8} style={{ marginLeft: spacing.md }}>
                    <Icon path="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" size={18} color={palette.danger} />
                  </Pressable>
                ) : null}
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={loading ? null : <EmptyState title="No cost centers" message="Add one to get started." />}
      />

      <FormSheet
        visible={sheet}
        title={draft.id ? 'Edit Cost Center' : 'New Cost Center'}
        onClose={() => setSheet(false)}
        onSave={save}
        saving={saving}
      >
        <TextField label="Code" value={draft.code} onChangeText={(v) => setDraft({ ...draft, code: v })} placeholder="e.g. CC-01" autoCapitalize="none" />
        <TextField label="Name" value={draft.name} onChangeText={(v) => setDraft({ ...draft, name: v })} placeholder="Cost center name" />
        <TextField label="Note" value={draft.note ?? ''} onChangeText={(v) => setDraft({ ...draft, note: v })} multiline />
        <SwitchField label="Active" value={draft.isActive} onValueChange={(v) => setDraft({ ...draft, isActive: v })} />
      </FormSheet>
    </View>
  );
}
