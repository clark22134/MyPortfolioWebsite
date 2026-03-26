import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService, AuthResponse, RegisterData } from './auth';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;
  let mockStorage: { [key: string]: string };

  beforeEach(() => {
    mockStorage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => mockStorage[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => { mockStorage[key] = value; });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => { delete mockStorage[key]; });

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start unauthenticated', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.userEmail()).toBeNull();
  });

  it('should login and store token', () => {
    const mockResponse: AuthResponse = { token: 'jwt-123', email: 'test@test.com' };

    service.login('test@test.com', 'password').subscribe(response => {
      expect(response.token).toBe('jwt-123');
    });

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@test.com', password: 'password' });
    req.flush(mockResponse);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.userEmail()).toBe('test@test.com');
    expect(mockStorage['authUser']).toBeDefined();
  });

  it('should register and store token', () => {
    const mockResponse: AuthResponse = { token: 'jwt-456', email: 'new@test.com' };
    const registerData: RegisterData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'new@test.com',
      password: 'password',
      shippingAddress: { street: '123 Main', city: 'NY', state: 'NY', zipCode: '10001', country: 'US' }
    };

    service.register(registerData).subscribe(response => {
      expect(response.token).toBe('jwt-456');
    });

    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);

    expect(service.isAuthenticated()).toBe(true);
  });

  it('should logout and clear state', () => {
    // First login
    const mockResponse: AuthResponse = { token: 'jwt-123', email: 'test@test.com' };
    service.login('test@test.com', 'password').subscribe();
    httpMock.expectOne('/api/auth/login').flush(mockResponse);

    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.userEmail()).toBeNull();
    expect(service.getToken()).toBeNull();
    expect(mockStorage['authUser']).toBeUndefined();
    expect(router.navigate).toHaveBeenCalledWith(['/products']);
  });

  it('should return token when authenticated', () => {
    const mockResponse: AuthResponse = { token: 'jwt-123', email: 'test@test.com' };
    service.login('test@test.com', 'password').subscribe();
    httpMock.expectOne('/api/auth/login').flush(mockResponse);

    expect(service.getToken()).toBe('jwt-123');
  });

  it('should return null token when not authenticated', () => {
    expect(service.getToken()).toBeNull();
  });

  it('should fetch user profile', () => {
    service.getProfile().subscribe(profile => {
      expect(profile.email).toBe('test@test.com');
      expect(profile.firstName).toBe('John');
    });

    const req = httpMock.expectOne('/api/auth/profile');
    expect(req.request.method).toBe('GET');
    req.flush({ firstName: 'John', lastName: 'Doe', email: 'test@test.com', defaultShippingAddress: null, defaultBillingAddress: null, cardType: null, nameOnCard: null, cardNumberLast4: null, cardExpirationMonth: null, cardExpirationYear: null });
  });

  it('should restore session from localStorage', () => {
    // Set up storage before creating the service
    mockStorage['authUser'] = JSON.stringify({ token: 'stored-token', email: 'stored@test.com' });

    // Re-create a fresh service via TestBed to properly read from storage
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    const freshService = TestBed.inject(AuthService);
    expect(freshService.isAuthenticated()).toBe(true);
    expect(freshService.getToken()).toBe('stored-token');
    expect(freshService.userEmail()).toBe('stored@test.com');
  });
});
