import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { UserInfo } from '../models/ats.models';

function runGuard(routeData: Record<string, unknown> = {}) {
  const route = { data: routeData } as unknown as ActivatedRouteSnapshot;
  const state = { url: '/jobs' } as RouterStateSnapshot;
  const result = TestBed.runInInjectionContext(() => authGuard(route, state));
  return isObservable(result) ? firstValueFrom(result) : Promise.resolve(result);
}

describe('authGuard', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  const user: UserInfo = {
    id: 1, username: 'alice', email: 'a@b.com', fullName: 'Alice',
    role: 'RECRUITER', enabled: true, createdAt: '2026-01-01', lastLoginAt: null
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('allows authenticated user', async () => {
    const promise = runGuard();
    httpMock.expectOne('/api/auth/me').flush(user);
    const allowed = await promise;
    expect(allowed).toBe(true);
  });

  it('redirects unauthenticated user to login', async () => {
    const spy = vi.spyOn(router, 'navigate');
    const promise = runGuard();
    httpMock.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    const allowed = await promise;
    expect(allowed).toBe(false);
    expect(spy).toHaveBeenCalledWith(['/login'], expect.objectContaining({ queryParams: { returnUrl: '/jobs' } }));
  });

  it('denies user without required role', async () => {
    const spy = vi.spyOn(router, 'navigate');
    const promise = runGuard({ roles: ['ADMIN'] });
    httpMock.expectOne('/api/auth/me').flush(user);
    const allowed = await promise;
    expect(allowed).toBe(false);
    expect(spy).toHaveBeenCalledWith(['/']);
  });
});

// Vitest provides `vi`; declare for TypeScript.
declare const vi: typeof import('vitest').vi;
