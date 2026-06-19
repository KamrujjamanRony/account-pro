import { Service, computed, inject } from '@angular/core';
import { AuthService } from './auth-service';
import { MenuPermissionNode } from '../models/user.model';
import { PermissionAction } from '../models/menu.model';

/** A menu and the route it maps to, in sidebar order (used for fallbacks). */
export interface MenuRoute {
  menu: string;
  path: string;
}

/**
 * Canonical menu → route map. The `menu` values must match the `menuName`
 * stored in each user's permission tree (and the labels in the permission UI).
 */
export const MENU_ROUTES: MenuRoute[] = [
  { menu: 'Dashboard', path: '/dashboard' },
  { menu: 'Chart of Account', path: '/chart-of-account' },
  { menu: 'Ledger', path: '/ledger' },
  { menu: 'Voucher', path: '/voucher' },
  { menu: 'Cash Book', path: '/cash-book' },
  { menu: 'Bank Book', path: '/bank-book' },
  { menu: 'Receipt & Payment', path: '/receipt-payment-statement' },
  { menu: 'General Ledger', path: '/general-ledger' },
  { menu: 'Trial Balance', path: '/trial-balance' },
  { menu: 'Balance Sheet', path: '/balance-sheet' },
  { menu: 'Users', path: '/user-list' },
  { menu: 'Menus', path: '/menu-list' },
];

/**
 * Reads the signed-in user's menu-permission tree and answers permission
 * questions. Derived reactively from {@link AuthService.currentUser}, so any
 * `can(...)` call in a template or effect re-evaluates when the user changes.
 *
 * Policy: deny by default. A menu/action is granted only when the user's
 * permission tree explicitly selects it. A user with no granted permissions
 * can see and do nothing.
 */
@Service()
export class PermissionService {
  private auth = inject(AuthService);

  /** menuName → set of granted action names, flattened from the user's tree. */
  private readonly index = computed(() => {
    const map = new Map<string, Set<string>>();
    const user = this.auth.currentUser();
    if (user) this.indexNodes(user.menuPermissions ?? [], map);
    return map;
  });

  /** Whether the user holds `action` on the named menu. */
  can(menu: string, action: PermissionAction = 'view'): boolean {
    return this.index().get(menu)?.has(action) ?? false;
  }

  canView(menu: string): boolean {
    return this.can(menu, 'view');
  }

  canCreate(menu: string): boolean {
    return this.can(menu, 'create');
  }

  canEdit(menu: string): boolean {
    return this.can(menu, 'edit');
  }

  canDelete(menu: string): boolean {
    return this.can(menu, 'delete');
  }

  /** Menus the user may view, in canonical order (drives the sidebar). */
  viewableMenus(): MenuRoute[] {
    return MENU_ROUTES.filter(m => this.canView(m.menu));
  }

  /** First route the user may view, for redirecting away from denied pages. */
  firstAllowedPath(): string {
    return this.viewableMenus()[0]?.path ?? '/login';
  }

  private indexNodes(nodes: MenuPermissionNode[], map: Map<string, Set<string>>): void {
    for (const node of nodes) {
      if (node.isSelected) {
        const granted = new Set<string>();
        for (const key of node.permissionsKey ?? []) {
          if (key.isSelected) granted.add(key.permission);
        }
        map.set(node.menuName, granted);
      }
      this.indexNodes(node.children ?? [], map);
    }
  }
}
