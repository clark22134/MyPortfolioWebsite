import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Role } from '../models/auth.model';

/**
 * Route guard: redirect unauthenticated users to /login (with returnUrl).
 * Optionally enforce a set of allowed roles via route `data.roles`.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.whenReady().pipe(
    map(authed => {
      if (!authed) {
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }
      const allowed = (route.data?.['roles'] as Role[] | undefined) ?? [];
      if (allowed.length > 0 && !auth.hasAnyRole(...allowed)) {
        router.navigate(['/']);
        return false;
      }
      return true;
    })
  );
};
