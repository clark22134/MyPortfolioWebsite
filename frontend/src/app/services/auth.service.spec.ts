import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { LoginRequest, LoginResponse, RegisterRequest } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should login successfully and store token', () => {
      const loginRequest: LoginRequest = {
        username: 'testuser',
        password: 'password123'
      };

      const mockResponse: LoginResponse = {
        token: 'mock-jwt-token',
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User'
      };

      service.login(loginRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('token')).toBe('mock-jwt-token');
        expect(localStorage.getItem('currentUser')).toBe(JSON.stringify(mockResponse));
      });

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(loginRequest);
      req.flush(mockResponse);
    });

    it('should update currentUser$ observable on login', (done) => {
      const loginRequest: LoginRequest = {
        username: 'testuser',
        password: 'password123'
      };

      const mockResponse: LoginResponse = {
        token: 'mock-jwt-token',
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User'
      };

      service.currentUser$.subscribe(user => {
        if (user) {
          expect(user).toEqual(mockResponse);
          done();
        }
      });

      service.login(loginRequest).subscribe();

      const req = httpMock.expectOne('/api/auth/login');
      req.flush(mockResponse);
    });

    it('should handle login errors', () => {
      const loginRequest: LoginRequest = {
        username: 'wronguser',
        password: 'wrongpass'
      };

      service.login(loginRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('register', () => {
    it('should register a new user successfully', () => {
      const registerRequest: RegisterRequest = {
        username: 'newuser',
        password: 'password123',
        email: 'newuser@example.com',
        fullName: 'New User'
      };

      const mockResponse = { message: 'User registered successfully' };

      service.register(registerRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registerRequest);
      req.flush(mockResponse);
    });

    it('should handle registration errors', () => {
      const registerRequest: RegisterRequest = {
        username: 'existinguser',
        password: 'password123',
        email: 'existing@example.com',
        fullName: 'Existing User'
      };

      service.register(registerRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
        }
      });

      const req = httpMock.expectOne('/api/auth/register');
      req.flush('User already exists', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('logout', () => {
    it('should clear localStorage and reset currentUser$', (done) => {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('currentUser', JSON.stringify({ token: 'mock-token' }));

      service.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('currentUser')).toBeNull();

      service.currentUser$.subscribe(user => {
        expect(user).toBeNull();
        done();
      });
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is logged in', () => {
      const mockResponse: LoginResponse = { 
        token: 'mock-token',
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User'
      };
      localStorage.setItem('currentUser', JSON.stringify(mockResponse));
      
      // Recreate service to load from localStorage
      service = new AuthService(TestBed.inject(HttpClientTestingModule) as any);
      
      // Manually set the current user
      (service as any).currentUserSubject.next(mockResponse);

      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when user is not logged in', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      localStorage.setItem('token', 'mock-token');
      expect(service.getToken()).toBe('mock-token');
    });

    it('should return null when no token exists', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('initialization', () => {
    it('should load user from localStorage on init', () => {
      const mockUser: LoginResponse = { 
        token: 'stored-token',
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User'
      };
      localStorage.setItem('currentUser', JSON.stringify(mockUser));

      const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any);

      newService.currentUser$.subscribe(user => {
        expect(user).toEqual(mockUser);
      });
    });

    it('should have null user when localStorage is empty', (done) => {
      const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any);

      newService.currentUser$.subscribe(user => {
        expect(user).toBeNull();
        done();
      });
    });
  });
});
