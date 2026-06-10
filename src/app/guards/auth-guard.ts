import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router: Router = inject(Router);
  const userInfo = auth.getUser();
  if (userInfo) {
    return true;
  } else {
    auth.deleteUser();
    router.navigate(['/login']);
    return false;
  }
};
