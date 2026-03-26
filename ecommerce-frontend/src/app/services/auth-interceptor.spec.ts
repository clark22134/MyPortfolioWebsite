import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth-interceptor';
import { AuthService } from './auth';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should not add Authorization header for public endpoints', () => {
    httpClient.get('/api/products').subscribe();
    const req = httpMock.expectOne('/api/products');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('should not add Authorization header when not authenticated', () => {
    httpClient.get('/api/orders').subscribe();
    const req = httpMock.expectOne('/api/orders');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('should add Authorization header for secured endpoints when authenticated', () => {
    // Login first
    authService.login('test@test.com', 'pass').subscribe();
    const loginReq = httpMock.expectOne('/api/auth/login');
    loginReq.flush({ token: 'my-jwt-token', email: 'test@test.com' });

    // Now make a secured request
    httpClient.get('/api/orders').subscribe();
    const req = httpMock.expectOne('/api/orders');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-jwt-token');
    req.flush([]);
  });

  it('should add Authorization for checkout endpoint', () => {
    authService.login('test@test.com', 'pass').subscribe();
    httpMock.expectOne('/api/auth/login').flush({ token: 'tok', email: 'test@test.com' });

    httpClient.post('/api/checkout/purchase', {}).subscribe();
    const req = httpMock.expectOne('/api/checkout/purchase');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok');
    req.flush({});
  });

  it('should add Authorization for profile endpoint', () => {
    authService.login('test@test.com', 'pass').subscribe();
    httpMock.expectOne('/api/auth/login').flush({ token: 'tok', email: 'test@test.com' });

    httpClient.get('/api/auth/profile').subscribe();
    const req = httpMock.expectOne('/api/auth/profile');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok');
    req.flush({});
  });
});
