import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * 1. Always send cookies (the SPA + API share a domain in prod; auth is cookie-based).
 * 2. On 401, attempt a one-shot silent refresh. If that fails, push the user to /login.
 *    Auth endpoints bypass the refresh dance so we don't loop.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const apiReq = req.url.startsWith('/api/')
    ? req.clone({ withCredentials: true })
    : req;

  const isAuthEndpoint = req.url.startsWith('/api/auth/');

  return next(apiReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        switchMap(user => {
          if (user) {
            return next(apiReq);
          }
          router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          return throwError(() => error);
        })
      );
    })
  );
};
