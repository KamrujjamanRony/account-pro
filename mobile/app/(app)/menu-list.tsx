import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { usePermissions } from '../../src/hooks/usePermissions';
import { environment } from '../../src/config/env';
import { radius, spacing } from '../../src/config/theme';
import { menuService } from '../../src/services/menu';
import { Menu, PERMISSION_ACTIONS } from '../../src/models/menu';
import { confirm, errMessage, notify } from '../../src/lib/alerts';
import { ListHeader } from '../../src/components/ListHeader';
import { Card, T, Badge, EmptyState } from '../../src/components/ui/layout';
import { Icon } from '../../src/components/ui/Icon';
import { FormSheet } from '../../src/components/ui/FormSheet';
import { TextField, SwitchField, Select, Option } from '../../src/components/ui/form';

interface Draft {
  id?: number;
  menuName: string;
  url: string;
  parentMenuId: number | null;
  icon: string;
  isActive: boolean;
  permissions: Record<string, boolean>;
}

const empty: Draft = {
  menuName: '',
  url: '',
  parentMenuId: null,
  icon: '',
  isActive: true,
  permissions: { view: true, create: false, edit: false, delete: false },
};

export default function MenusScreen() {
  const { palette } = useTheme();
  const { user: actor } = useAuth();
  const perms = usePermissions();
  const menu = 'Menu';

  const [items, setItems] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);

  const load = useCallback(async () => {
    try {
      setItems((await menuService.search({})) ?? []);
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
    return items.filter((m) => m.menuName.toLowerCase().includes(q) || (m.url ?? '').toLowerCase().includes(q));
  }, [items, search]);

  const nameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of items) if (m.id != null) map.set(m.id, m.menuName);
    return map;
  }, [items]);

  const parentOptions: Option<number>[] = items
    .filter((m) => m.id != null && m.id !== draft.id)
    .map((m) => ({ label: m.menuName, value: m.id! }));

  const openEdit = (m: Menu) => {
    if (!perms.canEdit(menu)) return;
    const keys = m.permissionsKey ?? [];
    setDraft({
      id: m.id,
      menuName: m.menuName,
      url: m.url ?? '',
      parentMenuId: m.parentMenuId ?? null,
      icon: m.icon ?? '',
      isActive: m.isActive,
      permissions: {
        view: keys.includes('view'),
        create: keys.includes('create'),
        edit: keys.includes('edit'),
        delete: keys.includes('delete'),
      },
    });
    setSheet(true);
  };

  const save = async () => {
    if (!draft.menuName.trim()) {
      notify('Required', 'Menu name is required.');
      return;
    }
    const postBy = actor?.userName ?? actor?.username ?? 'admin';
    const base: Menu = {
      companyID: environment.companyCode,
      menuName: draft.menuName.trim(),
      url: draft.url.trim(),
      parentMenuId: draft.parentMenuId ?? null,
      icon: draft.icon.trim(),
      isActive: draft.isActive,
      permissionsKey: PERMISSION_ACTIONS.filter((a) => draft.permissions[a]),
    };
    setSaving(true);
    try {
      if (draft.id == null) await menuService.add({ ...base, postBy });
      else await menuService.update(draft.id, { ...base, updateBy: postBy });
      setSheet(false);
      await load();
    } catch (err) {
      notify('Save failed', errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: Menu) => {
    if (m.id == null || !(await confirm('Delete menu', `Delete "${m.menuName}"?`))) return;
    try {
      await menuService.delete(m.id);
      await load();
    } catch (err) {
      notify('Delete failed', errMessage(err));
    }
  };

  const togglePerm = (key: string) => setDraft((d) => ({ ...d, permissions: { ...d.permissions, [key]: !d.permissions[key] } }));

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
        placeholder="Search menus…"
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
                    {item.menuName}
                  </T>
                  <T muted size={12} style={{ marginTop: 2 }}>
                    {item.url || '—'}
                    {item.parentMenuId != null ? ` · under ${nameById.get(item.parentMenuId) ?? `#${item.parentMenuId}`}` : ''}
                  </T>
                  {item.permissionsKey?.length ? (
                    <T muted size={11} style={{ marginTop: 2 }}>
                      {item.permissionsKey.join(', ')}
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
        ListEmptyComponent={loading ? null : <EmptyState title="No menus" message="Add a menu to get started." />}
      />

      <FormSheet visible={sheet} title={draft.id ? 'Edit Menu' : 'New Menu'} onClose={() => setSheet(false)} onSave={save} saving={saving}>
        <TextField label="Menu Name" value={draft.menuName} onChangeText={(v) => setDraft({ ...draft, menuName: v })} />
        <TextField label="URL" value={draft.url} onChangeText={(v) => setDraft({ ...draft, url: v })} placeholder="/dashboard" autoCapitalize="none" />
        <Select label="Parent Menu" value={draft.parentMenuId} options={parentOptions} onChange={(v) => setDraft({ ...draft, parentMenuId: v })} searchable placeholder="None (top level)" />
        <TextField label="Icon" value={draft.icon} onChangeText={(v) => setDraft({ ...draft, icon: v })} placeholder="icon name / svg path" autoCapitalize="none" />
        <T size={13} weight="600" style={{ marginBottom: 6 }}>
          Permissions
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {PERMISSION_ACTIONS.map((a) => {
            const on = draft.permissions[a];
            return (
              <Pressable
                key={a}
                onPress={() => togglePerm(a)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: on ? palette.primary : palette.surfaceAlt,
                  borderWidth: 1,
                  borderColor: on ? palette.primary : palette.border,
                }}
              >
                <T size={12} weight="700" color={on ? palette.onPrimary : palette.textMuted}>
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </T>
              </Pressable>
            );
          })}
        </View>
        <SwitchField label="Active" value={draft.isActive} onValueChange={(v) => setDraft({ ...draft, isActive: v })} />
      </FormSheet>
    </View>
  );
}
