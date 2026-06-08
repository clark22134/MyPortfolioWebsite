import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for the initial auth bootstrap to resolve before deciding, otherwise a
  // hard refresh of a protected route races the async /me check and a logged-in
  // user is wrongly redirected to /login.
  return authService.whenReady().pipe(
    map(isAuthenticated => (isAuthenticated ? true : router.createUrlTree(['/login'])))
  );
};
