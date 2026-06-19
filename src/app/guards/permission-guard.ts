import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission-service';

/**
 * Blocks navigation to a page the user cannot `view`. The target menu is read
 * from the route's `data.menu`; routes without it are always allowed. When
 * denied, redirects to the user's first viewable page (or login).
 */
export const permissionGuard: CanActivateFn = route => {
  const permissions = inject(PermissionService);
  const router = inject(Router);

  const menu = route.data?.['menu'] as string | undefined;
  if (!menu || permissions.canView(menu)) return true;

  return router.createUrlTree([permissions.firstAllowedPath()]);
};
