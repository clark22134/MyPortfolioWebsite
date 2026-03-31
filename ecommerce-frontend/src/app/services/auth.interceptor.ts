import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  if (req.url.startsWith('/api/')) {
    req = req.clone({ withCredentials: true });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if ((error.status === 401 || error.status === 403) &&
          req.url.startsWith('/api/') &&
          !AUTH_ENDPOINTS.some(e => req.url.includes(e))) {
        localStorage.removeItem('authUser');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
