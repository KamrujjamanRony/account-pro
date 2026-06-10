export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export const PERMISSION_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete'];

/** Flat menu record as returned by the Menu search/get endpoints. */
export interface Menu {
  id?: number;
  companyID: number;
  menuName: string;
  moduleName?: string;
  parentMenuId: number | null;
  url: string;
  isActive: boolean;
  icon?: string;
  permissionsKey: string[];
  postBy?: string;
  updateBy?: string;
}

/** A single permission flag for a menu within a user's permission tree. */
export interface PermissionKey {
  permission: string;
  isSelected: boolean;
}

/** Hierarchical menu node used for the permission tree (GenerateTreeData). */
export interface MenuTreeNode {
  id: number;
  parentMenuId: number | null;
  menuName: string;
  url?: string;
  icon?: string;
  isSelected?: boolean;
  permissionsKey: PermissionKey[];
  children: MenuTreeNode[];
}
