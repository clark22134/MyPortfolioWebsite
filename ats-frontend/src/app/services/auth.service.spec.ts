import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { UserInfo } from '../models/ats.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const aliceRecruiter: UserInfo = {
    id: 1, username: 'alice', email: 'a@b.com', fullName: 'Alice',
    role: 'RECRUITER', enabled: true, createdAt: '2026-01-01', lastLoginAt: null
  };
  const adminUser: UserInfo = { ...aliceRecruiter, id: 2, username: 'admin', role: 'ADMIN' };
  const manager: UserInfo = { ...aliceRecruiter, id: 3, username: 'mgr', role: 'HIRING_MANAGER' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('starts unauthenticated', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.role()).toBeNull();
  });

  it('bootstrap stores user on 200', async () => {
    const promise = firstValueFrom(service.bootstrap());
    httpMock.expectOne('/api/auth/me').flush(aliceRecruiter);
    const user = await promise;
    expect(user).toEqual(aliceRecruiter);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.initialized()).toBe(true);
  });

  it('bootstrap clears user on 401', async () => {
    const promise = firstValueFrom(service.bootstrap());
    httpMock.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    const user = await promise;
    expect(user).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('login sets current user', async () => {
    const promise = firstValueFrom(service.login({ username: 'alice', password: 'pw' }));
    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(aliceRecruiter);
    const user = await promise;
    expect(user.username).toBe('alice');
    expect(service.currentUser()?.username).toBe('alice');
  });

  it('logout clears user', async () => {
    service['_currentUser'].set(aliceRecruiter);
    const promise = firstValueFrom(service.logout());
    httpMock.expectOne('/api/auth/logout').flush(null);
    await promise;
    expect(service.currentUser()).toBeNull();
  });

  it('refresh on success stores user', async () => {
    const promise = firstValueFrom(service.refresh());
    httpMock.expectOne('/api/auth/refresh').flush(aliceRecruiter);
    const user = await promise;
    expect(user?.username).toBe('alice');
  });

  it('refresh on failure clears user and returns null', async () => {
    const promise = firstValueFrom(service.refresh());
    httpMock.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });
    const user = await promise;
    expect(user).toBeNull();
  });

  it('hasAnyRole, canWrite, isAdmin', () => {
    service['_currentUser'].set(adminUser);
    expect(service.hasAnyRole('ADMIN')).toBe(true);
    expect(service.canWrite()).toBe(true);
    expect(service.isAdmin()).toBe(true);

    service['_currentUser'].set(manager);
    expect(service.hasAnyRole('HIRING_MANAGER')).toBe(true);
    expect(service.canWrite()).toBe(false);
    expect(service.isAdmin()).toBe(false);

    service['_currentUser'].set(null);
    expect(service.hasAnyRole('ADMIN', 'RECRUITER')).toBe(false);
  });

  it('whenReady triggers bootstrap once', async () => {
    const promise = firstValueFrom(service.whenReady());
    httpMock.expectOne('/api/auth/me').flush(aliceRecruiter);
    expect(await promise).toBe(true);
  });
});
