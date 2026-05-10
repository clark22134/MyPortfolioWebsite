import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

import { LoginStatusComponent } from './login-status.component';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

describe('LoginStatusComponent', () => {
  let component: LoginStatusComponent;
  let fixture: ComponentFixture<LoginStatusComponent>;

  beforeEach(async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [LoginStatusComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginStatusComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call cartService.onLogout and authService.logout on logout', () => {
    const cartService = TestBed.inject(CartService);
    const authService = TestBed.inject(AuthService);
    vi.spyOn(cartService, 'onLogout').mockImplementation(() => {});
    vi.spyOn(authService, 'logout').mockImplementation(() => {});
    fixture.detectChanges();
    component.logout();
    expect(cartService.onLogout).toHaveBeenCalled();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('should goToLogin navigate to login page', async () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    await component.goToLogin();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/', expect.anything());
  });

  it('should render login status template', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el).toBeTruthy();
  });
});
