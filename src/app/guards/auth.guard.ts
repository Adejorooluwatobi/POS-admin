import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = localStorage.getItem('retail_os_token');
  if (token || authService.isLoggedIn()) {
    return true;
  }

  // Not authenticated, redirect to login with query params
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

export const superAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isSuperAdmin()) {
    return true;
  }

  // Access denied for non-superadmins
  router.navigate(['/app/dashboard']);
  return false;
};
