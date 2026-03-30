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

  it('should not add withCredentials for non-API endpoints', () => {
    httpClient.get('/other/resource').subscribe();
    const req = httpMock.expectOne('/other/resource');
    expect(req.request.withCredentials).toBe(false);
    req.flush([]);
  });

  it('should add withCredentials for API endpoints', () => {
    httpClient.get('/api/products').subscribe();
    const req = httpMock.expectOne('/api/products');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('should add withCredentials for secured endpoints', () => {
    httpClient.get('/api/orders').subscribe();
    const req = httpMock.expectOne('/api/orders');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('should add withCredentials for checkout endpoint', () => {
    httpClient.post('/api/checkout/purchase', {}).subscribe();
    const req = httpMock.expectOne('/api/checkout/purchase');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('should add withCredentials for profile endpoint', () => {
    httpClient.get('/api/auth/profile').subscribe();
    const req = httpMock.expectOne('/api/auth/profile');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });
});
