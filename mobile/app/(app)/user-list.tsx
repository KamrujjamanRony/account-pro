import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Switch, View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { usePermissions } from '../../src/hooks/usePermissions';
import { environment } from '../../src/config/env';
import { radius, spacing } from '../../src/config/theme';
import { userService } from '../../src/services/user';
import { menuService } from '../../src/services/menu';
import { Menu } from '../../src/models/menu';
import { MenuPermissionNode, User } from '../../src/models/user';
import {
  buildMenuPermissionTree,
  clonePermissionTree,
  flattenPermissionTree,
  setAllSelected,
  toggleNodeSelection,
  togglePermission,
} from '../../src/lib/tree';
import { confirm, errMessage, notify } from '../../src/lib/alerts';
import { ListHeader } from '../../src/components/ListHeader';
import { Card, T, Badge, EmptyState, Divider } from '../../src/components/ui/layout';
import { Button } from '../../src/components/ui/Button';
import { Icon } from '../../src/components/ui/Icon';
import { FormSheet } from '../../src/components/ui/FormSheet';
import { TextField, SwitchField } from '../../src/components/ui/form';

export default function UsersScreen() {
  const { palette } = useTheme();
  const { user: actor } = useAuth();
  const perms = usePermissions();
  const menu = 'User';

  const [users, setUsers] = useState<User[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [tree, setTree] = useState<MenuPermissionNode[]>([]);

  const load = useCallback(async () => {
    try {
      const [u, m] = await Promise.all([userService.search({ companyID: environment.companyCode }), menuService.search({})]);
      setUsers(u ?? []);
      setMenus(m ?? []);
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
    if (!q) return users;
    return users.filter((u) => (u.userName ?? u.username ?? '').toLowerCase().includes(q));
  }, [users, search]);

  const openCreate = () => {
    setEditingId(null);
    setUserName('');
    setPassword('');
    setIsActive(true);
    setTree(buildMenuPermissionTree(menus, false));
    setSheet(true);
  };

  const openEdit = async (u: User) => {
    if (!perms.canEdit(menu)) return;
    setEditingId(u.id ?? null);
    setUserName(u.userName ?? u.username ?? '');
    setPassword('');
    setIsActive(u.isActive);
    setTree(buildMenuPermissionTree(menus, false));
    setSheet(true);
    if (u.id != null) {
      try {
        const saved = (await menuService.generateTree(u.id)) as unknown as MenuPermissionNode[];
        setTree(saved?.length ? clonePermissionTree(saved) : buildMenuPermissionTree(menus, false));
      } catch {
        setTree(buildMenuPermissionTree(menus, false));
      }
    }
  };

  const save = async () => {
    if (!userName.trim()) {
      notify('Required', 'Username is required.');
      return;
    }
    if (editingId == null && !password) {
      notify('Required', 'Password is required for a new user.');
      return;
    }
    const postBy = actor?.userName ?? actor?.username ?? 'admin';
    setSaving(true);
    try {
      if (editingId == null) {
        await userService.add({
          username: userName.trim(),
          password,
          companyID: environment.companyCode,
          isActive,
          postBy,
          menuPermissions: tree,
        });
      } else {
        await userService.update(editingId, {
          id: editingId,
          userName: userName.trim(),
          password: password ?? '',
          isActive,
          postBy,
          updateBy: postBy,
          menuPermissions: tree,
        });
      }
      setSheet(false);
      await load();
    } catch (err) {
      notify('Save failed', errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u: User) => {
    if (u.id == null || !(await confirm('Delete user', `Delete "${u.userName ?? u.username}"?`))) return;
    try {
      await userService.delete(u.id);
      await load();
    } catch (err) {
      notify('Delete failed', errMessage(err));
    }
  };

  const flat = flattenPermissionTree(tree);

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, padding: spacing.lg }}>
      <ListHeader search={search} onSearch={setSearch} onAdd={openCreate} canAdd={perms.canCreate(menu)} placeholder="Search users…" />
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
                <View
                  style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}
                >
                  <T weight="800" color={palette.primary}>
                    {(item.userName ?? item.username ?? '?').charAt(0).toUpperCase()}
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T size={15} weight="700">
                    {item.userName ?? item.username}
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
        ListEmptyComponent={loading ? null : <EmptyState title="No users" message="Add a user to get started." />}
      />

      <FormSheet visible={sheet} title={editingId ? 'Edit User' : 'New User'} onClose={() => setSheet(false)} onSave={save} saving={saving}>
        <TextField label="Username" value={userName} onChangeText={setUserName} autoCapitalize="none" />
        <TextField
          label={editingId ? 'Password (leave blank to keep)' : 'Password'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <SwitchField label="Active" value={isActive} onValueChange={setIsActive} />

        <Divider />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <T size={15} weight="800" style={{ flex: 1 }}>
            Permissions
          </T>
          <Button label="All" size="sm" variant="ghost" onPress={() => setTree((t) => setAllSelected(t, true))} />
          <Button label="None" size="sm" variant="ghost" onPress={() => setTree((t) => setAllSelected(t, false))} />
        </View>

        {flat.map(({ node, level }) => (
          <View key={node.id} style={{ marginBottom: spacing.sm, paddingLeft: level * spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Switch
                value={node.isSelected}
                onValueChange={(v) => setTree((t) => toggleNodeSelection(t, node.id, v))}
                trackColor={{ true: palette.primary }}
              />
              <T size={14} weight="700" style={{ marginLeft: spacing.sm }}>
                {node.menuName}
              </T>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4, paddingLeft: 44 }}>
              {node.permissionsKey.map((p) => {
                const on = p.isSelected;
                return (
                  <Pressable
                    key={p.permission}
                    onPress={() => setTree((t) => togglePermission(t, node.id, p.permission, !on))}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: radius.pill,
                      backgroundColor: on ? palette.primary : palette.surfaceAlt,
                      borderWidth: 1,
                      borderColor: on ? palette.primary : palette.border,
                    }}
                  >
                    <T size={11} weight="700" color={on ? palette.onPrimary : palette.textMuted}>
                      {p.permission}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </FormSheet>
    </View>
  );
}
