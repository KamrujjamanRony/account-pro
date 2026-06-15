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
  menuPermissions: MenuPermissionNode[];
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
