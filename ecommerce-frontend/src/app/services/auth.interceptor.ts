import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor that ensures credentials (cookies) are sent with API requests.
 * JWT is stored in HTTP-only cookies by the backend.
 * CSRF (XSRF) token handling is provided by Angular's built-in withXsrfConfiguration().
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/api/')) {
    req = req.clone({ withCredentials: true });
  }
  return next(req);
};
