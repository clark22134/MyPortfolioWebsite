import { TestBed, fakeAsync, tick, discardPeriodicTasks, flush } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService, UserInfo } from './auth.service';
import { LoginRequest, RegisterRequest } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api/auth';

  // Helper to handle any pending refresh requests
  function flushPendingRefreshRequests(): void {
    try {
      const refreshReqs = httpMock.match(`${apiUrl}/refresh`);
      refreshReqs.forEach(req => req.flush({}));
    } catch {
      // No pending requests
    }
  }

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);

    // Handle the initial /me request that fires on service construction
    const meReq = httpMock.expectOne(`${apiUrl}/me`);
    meReq.flush(null, { status: 401, statusText: 'Unauthorized' });
    tick();
  }));

  afterEach(fakeAsync(() => {
    // Flush any pending timers and requests
    flushPendingRefreshRequests();
    discardPeriodicTasks();
    httpMock.verify();
  }));

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start with isAuthenticated as false after failed /me check', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should have null currentUser$ after failed /me check', (done) => {
      service.currentUser$.subscribe(user => {
        expect(user).toBeNull();
        done();
      });
    });
  });

  describe('login', () => {
    const loginRequest: LoginRequest = { username: 'testuser', password: 'password123' };
    const mockUserInfo: UserInfo = {
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User'
    };

    it('should send login request with credentials', fakeAsync(() => {
      service.login(loginRequest).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(loginRequest);
      expect(req.request.withCredentials).toBeTrue();
      req.flush(mockUserInfo);

      tick();
      // Cleanup: logout to cancel refresh timer
      service.logout().subscribe();
      httpMock.expectOne(`${apiUrl}/logout`).flush({});
      tick();
    }));

    it('should update isAuthenticated to true on successful login', fakeAsync(() => {
      service.login(loginRequest).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(mockUserInfo);

      tick();
      expect(service.isAuthenticated()).toBeTrue();

      // Cleanup
      service.logout().subscribe();
      httpMock.expectOne(`${apiUrl}/logout`).flush({});
      tick();
    }));

    it('should update currentUser$ on successful login', fakeAsync(() => {
      let user: UserInfo | null = null;
      service.currentUser$.subscribe(val => user = val);

      service.login(loginRequest).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(mockUserInfo);

      tick();
      expect(user).not.toBeNull();
      expect(user!.username).toBe(mockUserInfo.username);
      expect(user!.email).toBe(mockUserInfo.email);

      // Cleanup
      service.logout().subscribe();
      httpMock.expectOne(`${apiUrl}/logout`).flush({});
      tick();
    }));

    it('should not update auth state on failed login', fakeAsync(() => {
      service.login(loginRequest).subscribe({
        error: () => {}
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

      tick();
      expect(service.isAuthenticated()).toBeFalse();
    }));
  });

  describe('register', () => {
    const registerRequest: RegisterRequest = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      fullName: 'New User'
    };

    it('should send registration request with credentials', fakeAsync(() => {
      service.register(registerRequest).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registerRequest);
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ message: 'Registration successful' });
      tick();
    }));
  });

  describe('logout', () => {
    const mockUserInfo: UserInfo = {
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User'
    };

    it('should send logout request and clear auth state', fakeAsync(() => {
      // First login
      service.login({ username: 'testuser', password: 'password' }).subscribe();
      const loginReq = httpMock.expectOne(`${apiUrl}/login`);
      loginReq.flush(mockUserInfo);
      tick();

      expect(service.isAuthenticated()).toBeTrue();

      service.logout().subscribe();

      const logoutReq = httpMock.expectOne(`${apiUrl}/logout`);
      expect(logoutReq.request.method).toBe('POST');
      expect(logoutReq.request.withCredentials).toBeTrue();
      logoutReq.flush({});

      tick();
      expect(service.isAuthenticated()).toBeFalse();
    }));

    it('should clear auth state even if logout request fails', fakeAsync(() => {
      // First login
      service.login({ username: 'testuser', password: 'password' }).subscribe();
      const loginReq = httpMock.expectOne(`${apiUrl}/login`);
      loginReq.flush(mockUserInfo);
      tick();

      expect(service.isAuthenticated()).toBeTrue();

      service.logout().subscribe();

      const logoutReq = httpMock.expectOne(`${apiUrl}/logout`);
      logoutReq.flush({}, { status: 500, statusText: 'Server Error' });

      tick();
      expect(service.isAuthenticated()).toBeFalse();
    }));
  });

  describe('logoutAllDevices', () => {
    it('should send logout-all request', fakeAsync(() => {
      service.logoutAllDevices().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/logout-all`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBeTrue();
      req.flush({});

      tick();
    }));
  });

  describe('refreshToken', () => {
    it('should send refresh request with credentials', fakeAsync(() => {
      service.refreshToken().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBeTrue();
      req.flush({});

      tick();
      // Cleanup - cancel scheduled refresh
      service.logout().subscribe();
      httpMock.expectOne(`${apiUrl}/logout`).flush({});
      tick();
    }));

    it('should clear auth state on failed refresh', fakeAsync(() => {
      service.refreshToken().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/refresh`);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });

      tick();
      expect(service.isAuthenticated()).toBeFalse();
    }));
  });

  describe('getCurrentUser', () => {
    it('should fetch current user info', fakeAsync(() => {
      const mockUserInfo: UserInfo = {
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User'
      };

      service.getCurrentUser().subscribe(user => {
        expect(user).not.toBeNull();
        expect(user!.username).toBe(mockUserInfo.username);
      });

      const req = httpMock.expectOne(`${apiUrl}/me`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBeTrue();
      req.flush(mockUserInfo);

      tick();
      // Cleanup
      service.logout().subscribe();
      httpMock.expectOne(`${apiUrl}/logout`).flush({});
      tick();
    }));

    it('should return null and clear state on failed request', fakeAsync(() => {
      service.getCurrentUser().subscribe(user => {
        expect(user).toBeNull();
      });

      const req = httpMock.expectOne(`${apiUrl}/me`);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });

      tick();
      expect(service.isAuthenticated()).toBeFalse();
    }));
  });

  describe('isAuthenticated', () => {
    it('should return false when not authenticated', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should return true when authenticated', fakeAsync(() => {
      const mockUserInfo: UserInfo = {
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User'
      };

      service.login({ username: 'testuser', password: 'password' }).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(mockUserInfo);

      tick();
      expect(service.isAuthenticated()).toBeTrue();

      // Cleanup
      service.logout().subscribe();
      httpMock.expectOne(`${apiUrl}/logout`).flush({});
      tick();
    }));
  });
});
