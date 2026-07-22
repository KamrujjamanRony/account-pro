import { Menu, PERMISSION_ACTIONS, PermissionKey } from '../models/menu';
import { MenuPermissionNode } from '../models/user';

/** A node paired with its depth, for flat rendering of a tree. */
export interface FlatNode {
  node: MenuPermissionNode;
  level: number;
}

/**
 * Build a menu-permission tree from the flat menu list. Each menu's
 * `permissionsKey` strings become toggleable permission flags. When the menu
 * declares no permissions, the standard view/create/edit/delete set is used.
 */
export function buildMenuPermissionTree(menus: Menu[], allSelected = false): MenuPermissionNode[] {
  const toNode = (menu: Menu): MenuPermissionNode => {
    const actions = menu.permissionsKey?.length ? menu.permissionsKey : [...PERMISSION_ACTIONS];
    return {
      id: menu.id!,
      parentMenuId: menu.parentMenuId ?? null,
      menuName: menu.menuName,
      isSelected: allSelected,
      permissionsKey: actions.map((p) => ({ permission: p, isSelected: allSelected })),
      children: [],
    };
  };

  const byId = new Map<number, MenuPermissionNode>();
  for (const menu of menus) if (menu.id != null) byId.set(menu.id, toNode(menu));

  const roots: MenuPermissionNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentMenuId != null ? byId.get(node.parentMenuId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export function clonePermissionTree(nodes: MenuPermissionNode[]): MenuPermissionNode[] {
  return nodes.map((n) => ({
    ...n,
    permissionsKey: n.permissionsKey.map((p) => ({ ...p })),
    children: clonePermissionTree(n.children ?? []),
  }));
}

export function setAllSelected(nodes: MenuPermissionNode[], value: boolean): MenuPermissionNode[] {
  return nodes.map((n) => ({
    ...n,
    isSelected: value,
    permissionsKey: n.permissionsKey.map((p) => ({ ...p, isSelected: value })),
    children: setAllSelected(n.children ?? [], value),
  }));
}

export function flattenPermissionTree(nodes: MenuPermissionNode[], level = 0): FlatNode[] {
  const out: FlatNode[] = [];
  for (const node of nodes) {
    out.push({ node, level });
    out.push(...flattenPermissionTree(node.children ?? [], level + 1));
  }
  return out;
}

export function toggleNodeSelection(nodes: MenuPermissionNode[], id: number, value: boolean): MenuPermissionNode[] {
  return nodes.map((n) => {
    if (n.id === id) {
      return {
        ...n,
        isSelected: value,
        permissionsKey: n.permissionsKey.map((p) => ({ ...p, isSelected: value })),
        children: setAllSelected(n.children ?? [], value),
      };
    }
    return { ...n, children: toggleNodeSelection(n.children ?? [], id, value) };
  });
}

export function togglePermission(
  nodes: MenuPermissionNode[],
  id: number,
  permission: string,
  value: boolean,
): MenuPermissionNode[] {
  return nodes.map((n) => {
    if (n.id === id) {
      const permissionsKey: PermissionKey[] = n.permissionsKey.map((p) =>
        p.permission === permission ? { ...p, isSelected: value } : p,
      );
      const isSelected = value ? true : n.isSelected;
      return { ...n, isSelected, permissionsKey };
    }
    return { ...n, children: togglePermission(n.children ?? [], id, permission, value) };
  });
}
