import { PermissionKey } from './menu.model';

/** A node in a user's menu-permission tree (mirrors the API payload). */
export interface MenuPermissionNode {
  id: number;
  parentMenuId: number | null;
  menuName: string;
  isSelected: boolean;
  permissionsKey: PermissionKey[];
  children: MenuPermissionNode[];
}

/**
 * Flat menu permission as returned by the login `userMenu` array, e.g.
 * `{ menuName: 'Ledger', permissions: ['view', 'create'] }`. This is the
 * authoritative source for enforcing the signed-in user's access.
 */
export interface UserMenuPermission {
  menuName: string;
  permissions: string[];
}

/** Payload returned under `data` by the Login / RefreshToken endpoints. */
export interface AuthResult {
  token: string;
  expiration?: string;
  refreshToken?: string;
  refreshTokenExpiration?: string;
  userMenu?: UserMenuPermission[];
  username?: string;
}

/** User record. The API uses `username` on create and `userName` elsewhere. */
export interface User {
  id?: number;
  username?: string;
  userName?: string;
  password?: string;
  companyID?: number;
  isActive: boolean;
  postBy?: string;
  updateBy?: string;
  /** JWT issued by the `Authentication/Login` endpoint. */
  token?: string;
  /** Nested permission tree (used by the user editor; not returned by login). */
  menuPermissions: MenuPermissionNode[];
  /** Flat permissions for the signed-in user (from the login `userMenu`). */
  userMenu?: UserMenuPermission[];
}

export interface UserSearchQuery {
  companyID: number;
  userName?: string;
  postBy?: string;
}

/** Payload for the `Authentication/Login` endpoint. */
export interface LoginRequest {
  username: string;
  password: string;
  companyID: number;
}
