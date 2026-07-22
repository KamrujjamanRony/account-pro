import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { NAV_ITEMS, NavItem } from '../config/menu';
import { PermissionAction } from '../models/menu';

/**
 * Reads the signed-in user's flat `userMenu` permissions and answers permission
 * questions. Policy: deny by default — a menu/action is granted only when the
 * user's permissions explicitly select it. Mirrors the Angular PermissionService.
 */
export function usePermissions() {
  const { user } = useAuth();

  const index = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const entry of user?.userMenu ?? []) {
      map.set(entry.menuName, new Set(entry.permissions ?? []));
    }
    return map;
  }, [user]);

  const can = (menu: string, action: PermissionAction = 'view') => index.get(menu)?.has(action) ?? false;

  /** Nav items (with allowed children) the signed-in user may view. */
  const visibleNavItems = useMemo<NavItem[]>(
    () =>
      NAV_ITEMS.map((item) => {
        if (item.children) {
          const children = item.children.filter((c) => can(c.menu));
          return children.length ? { ...item, children } : null;
        }
        return can(item.label) ? item : null;
      }).filter((item): item is NavItem => item !== null),
    [index],
  );

  /** First route the user may view, for redirecting away from denied pages. */
  const firstAllowedPath = (): string => {
    for (const item of visibleNavItems) {
      if (item.path) return item.path;
      if (item.children?.length) return item.children[0].path;
    }
    return '/login';
  };

  return {
    can,
    canView: (menu: string) => can(menu, 'view'),
    canCreate: (menu: string) => can(menu, 'create'),
    canEdit: (menu: string) => can(menu, 'edit'),
    canDelete: (menu: string) => can(menu, 'delete'),
    visibleNavItems,
    firstAllowedPath,
  };
}
