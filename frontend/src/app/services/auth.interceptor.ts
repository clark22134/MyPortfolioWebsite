import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

// Track if we're currently refreshing
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<boolean>(false);

/**
 * HTTP interceptor that:
 * 1. Adds withCredentials to all API requests (sends cookies)
 * 2. Reads CSRF token from cookie and adds to header
 * 3. Handles 401 errors with automatic token refresh
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);

  // Only intercept API requests
  if (!req.url.startsWith('/api')) {
    return next(req);
  }

  // Clone request with credentials and CSRF token
  const modifiedReq = addCredentialsAndCsrf(req);

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized - try to refresh token
      if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh')) {
        return handle401Error(req, next, authService);
      }
      return throwError(() => error);
    })
  );
};

/**
 * Add withCredentials and CSRF token to request
 */
function addCredentialsAndCsrf(req: HttpRequest<unknown>): HttpRequest<unknown> {
  let modifiedReq = req.clone({ withCredentials: true });

  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      modifiedReq = modifiedReq.clone({
        headers: modifiedReq.headers.set('X-XSRF-TOKEN', csrfToken)
      });
    }
  }

  return modifiedReq;
}

/**
 * Read CSRF token from XSRF-TOKEN cookie
 */
function getCsrfTokenFromCookie(): string | null {
  const name = 'XSRF-TOKEN=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookies = decodedCookie.split(';');

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(name)) {
      return cookie.substring(name.length);
    }
  }
  return null;
}

/**
 * Handle 401 error by attempting token refresh
 */
function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(false);

    return authService.refreshToken().pipe(
      switchMap((result) => {
        isRefreshing = false;
        refreshTokenSubject.next(true);

        if (result) {
          // Retry the original request
          return next(addCredentialsAndCsrf(req));
        }

        // Refresh failed - propagate error
        return throwError(() => new HttpErrorResponse({ status: 401 }));
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshTokenSubject.next(false);
        return throwError(() => err);
      })
    );
  } else {
    // Wait for refresh to complete, then retry
    return refreshTokenSubject.pipe(
      filter(refreshed => refreshed),
      take(1),
      switchMap(() => next(addCredentialsAndCsrf(req)))
    );
  }
}
