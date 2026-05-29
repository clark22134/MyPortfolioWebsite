import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('adds withCredentials to /api requests', async () => {
    const promise = firstValueFrom(http.get('/api/jobs'));
    const req = httpMock.expectOne('/api/jobs');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
    await promise;
  });

  it('does not touch non-/api urls', async () => {
    const promise = firstValueFrom(http.get('/assets/x.json'));
    const req = httpMock.expectOne('/assets/x.json');
    expect(req.request.withCredentials).toBe(false);
    req.flush({});
    await promise;
  });

  it('on 401 attempts refresh and retries', async () => {
    const promise = firstValueFrom(http.get('/api/jobs'));
    const first = httpMock.expectOne('/api/jobs');
    first.flush(null, { status: 401, statusText: 'Unauthorized' });
    const refresh = httpMock.expectOne('/api/auth/refresh');
    refresh.flush({
      id: 1, username: 'alice', email: 'a@b.com', fullName: 'Alice',
      role: 'RECRUITER', enabled: true, createdAt: '2026-01-01', lastLoginAt: null
    });
    const retry = httpMock.expectOne('/api/jobs');
    retry.flush([{ id: 1 }]);
    const data = await promise;
    expect(Array.isArray(data)).toBe(true);
  });

  it('on 401 + failed refresh, redirects to /login', async () => {
    const navSpy = vi.spyOn(router, 'navigate');
    const promise = firstValueFrom(http.get('/api/jobs')).catch(e => e);
    httpMock.expectOne('/api/jobs').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });
    const err = await promise;
    expect(err?.status).toBe(401);
    expect(navSpy).toHaveBeenCalled();
  });

  it('does not loop refresh when an auth endpoint itself 401s', async () => {
    const promise = firstValueFrom(http.post('/api/auth/login', {})).catch(e => e);
    httpMock.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });
    const err = await promise;
    expect(err?.status).toBe(401);
  });
});

declare const vi: typeof import('vitest').vi;
