import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: { refreshToken: ReturnType<typeof vi.fn> };

  function clearCookies(): void {
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  }

  beforeEach(() => {
    authService = { refreshToken: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    clearCookies();
  });

  afterEach(() => {
    httpMock.verify();
    clearCookies();
  });

  it('leaves non-/api requests untouched (no credentials)', () => {
    http.get('/assets/config.json', { responseType: 'text' }).subscribe();

    const req = httpMock.expectOne('/assets/config.json');
    expect(req.request.withCredentials).toBe(false);
    req.flush('ok');
  });

  it('adds withCredentials to /api requests', () => {
    http.get('/api/projects').subscribe();

    const req = httpMock.expectOne('/api/projects');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('does not attach a CSRF header to safe (GET) requests', () => {
    document.cookie = 'XSRF-TOKEN=tok-123';

    http.get('/api/projects').subscribe();

    const req = httpMock.expectOne('/api/projects');
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    req.flush([]);
  });

  it('attaches the CSRF token from the cookie to state-changing requests', () => {
    document.cookie = 'XSRF-TOKEN=tok-123';

    http.post('/api/contact', { msg: 'hi' }).subscribe();

    const req = httpMock.expectOne('/api/contact');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('tok-123');
    req.flush({});
  });

  it('refreshes the token and retries the request once on a 401', () => {
    authService.refreshToken.mockReturnValue(of(true));

    let response: unknown;
    http.get('/api/secure').subscribe(r => (response = r));

    httpMock
      .expectOne('/api/secure')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshToken).toHaveBeenCalledTimes(1);

    const retry = httpMock.expectOne('/api/secure');
    expect(retry.request.withCredentials).toBe(true);
    retry.flush({ ok: true });

    expect(response).toEqual({ ok: true });
  });

  it('propagates the error and does not retry when refresh fails', () => {
    authService.refreshToken.mockReturnValue(of(false));

    let errorStatus: number | undefined;
    http.get('/api/secure').subscribe({
      error: err => (errorStatus = err.status),
    });

    httpMock
      .expectOne('/api/secure')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshToken).toHaveBeenCalledTimes(1);
    expect(errorStatus).toBe(401);
  });

  it('does not attempt a refresh for failed login requests', () => {
    let errorStatus: number | undefined;
    http.post('/api/auth/login', {}).subscribe({
      error: err => (errorStatus = err.status),
    });

    httpMock
      .expectOne('/api/auth/login')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshToken).not.toHaveBeenCalled();
    expect(errorStatus).toBe(401);
  });
});
