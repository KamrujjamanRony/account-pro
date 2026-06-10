import { Menu, PERMISSION_ACTIONS, PermissionKey } from '../models/menu.model';
import { MenuPermissionNode } from '../models/user.model';

/** A node paired with its depth, for flat rendering of a tree. */
export interface FlatNode<T> {
  node: T;
  level: number;
}

/**
 * Build a menu-permission tree from the flat menu list. Each menu's
 * `permissionsKey` strings become toggleable permission flags. When the menu
 * declares no permissions, the standard view/create/edit/delete set is used.
 */
export function buildMenuPermissionTree(
  menus: Menu[],
  allSelected = false,
): MenuPermissionNode[] {
  const toNode = (menu: Menu): MenuPermissionNode => {
    const actions = menu.permissionsKey?.length ? menu.permissionsKey : [...PERMISSION_ACTIONS];
    return {
      id: menu.id!,
      parentMenuId: menu.parentMenuId ?? null,
      menuName: menu.menuName,
      isSelected: allSelected,
      permissionsKey: actions.map(p => ({ permission: p, isSelected: allSelected })),
      children: [],
    };
  };

  const byId = new Map<number, MenuPermissionNode>();
  for (const menu of menus) {
    if (menu.id != null) byId.set(menu.id, toNode(menu));
  }

  const roots: MenuPermissionNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentMenuId != null ? byId.get(node.parentMenuId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Deep clone of a permission tree (so edits don't mutate the source). */
export function clonePermissionTree(nodes: MenuPermissionNode[]): MenuPermissionNode[] {
  return nodes.map(n => ({
    ...n,
    permissionsKey: n.permissionsKey.map(p => ({ ...p })),
    children: clonePermissionTree(n.children ?? []),
  }));
}

/** Return a new tree with every node and permission set to `value`. */
export function setAllSelected(
  nodes: MenuPermissionNode[],
  value: boolean,
): MenuPermissionNode[] {
  return nodes.map(n => ({
    ...n,
    isSelected: value,
    permissionsKey: n.permissionsKey.map(p => ({ ...p, isSelected: value })),
    children: setAllSelected(n.children ?? [], value),
  }));
}

/** Flatten a permission tree depth-first, recording each node's level. */
export function flattenPermissionTree(
  nodes: MenuPermissionNode[],
  level = 0,
): FlatNode<MenuPermissionNode>[] {
  const out: FlatNode<MenuPermissionNode>[] = [];
  for (const node of nodes) {
    out.push({ node, level });
    out.push(...flattenPermissionTree(node.children ?? [], level + 1));
  }
  return out;
}

/**
 * Toggle a node (by id) and cascade selection to all descendants. When a node
 * is selected, its permissions default to selected; when cleared, all
 * permissions and descendants are cleared. Returns a new tree.
 */
export function toggleNodeSelection(
  nodes: MenuPermissionNode[],
  id: number,
  value: boolean,
): MenuPermissionNode[] {
  return nodes.map(n => {
    if (n.id === id) {
      return {
        ...n,
        isSelected: value,
        permissionsKey: n.permissionsKey.map(p => ({ ...p, isSelected: value })),
        children: setAllSelected(n.children ?? [], value),
      };
    }
    return { ...n, children: toggleNodeSelection(n.children ?? [], id, value) };
  });
}

/** Toggle a single permission flag on a node (by id). Returns a new tree. */
export function togglePermission(
  nodes: MenuPermissionNode[],
  id: number,
  permission: string,
  value: boolean,
): MenuPermissionNode[] {
  return nodes.map(n => {
    if (n.id === id) {
      const permissionsKey: PermissionKey[] = n.permissionsKey.map(p =>
        p.permission === permission ? { ...p, isSelected: value } : p,
      );
      // Selecting any permission implies the menu itself is selected.
      const isSelected = value ? true : n.isSelected;
      return { ...n, isSelected, permissionsKey };
    }
    return { ...n, children: togglePermission(n.children ?? [], id, permission, value) };
  });
}
