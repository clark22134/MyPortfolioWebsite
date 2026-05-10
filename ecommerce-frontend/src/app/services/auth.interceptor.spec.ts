import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

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

  it('should redirect to login and remove authUser on 401 from non-auth API', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    let errorReceived = false;
    httpClient.get('/api/orders').subscribe({ error: () => { errorReceived = true; } });
    const req = httpMock.expectOne('/api/orders');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(errorReceived).toBe(true);
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith('authUser');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should redirect to login on 403 from non-auth API', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    let errorReceived = false;
    httpClient.get('/api/orders').subscribe({ error: () => { errorReceived = true; } });
    const req = httpMock.expectOne('/api/orders');
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(errorReceived).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should NOT redirect to login on 401 from auth endpoint /api/auth/login', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    let errorReceived = false;
    httpClient.post('/api/auth/login', {}).subscribe({ error: () => { errorReceived = true; } });
    const req = httpMock.expectOne('/api/auth/login');
    req.flush('Bad credentials', { status: 401, statusText: 'Unauthorized' });

    expect(errorReceived).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should NOT redirect on 404 error (non 401/403)', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    let errorReceived = false;
    httpClient.get('/api/products').subscribe({ error: () => { errorReceived = true; } });
    const req = httpMock.expectOne('/api/products');
    req.flush('Not found', { status: 404, statusText: 'Not Found' });

    expect(errorReceived).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
