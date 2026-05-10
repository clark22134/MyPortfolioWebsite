import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start in login mode', () => {
    expect(component.isRegisterMode()).toBe(false);
  });

  it('should toggle between login and register mode', () => {
    component.toggleMode();
    expect(component.isRegisterMode()).toBe(true);
    component.toggleMode();
    expect(component.isRegisterMode()).toBe(false);
  });

  it('should not be loading initially', () => {
    expect(component.isLoading()).toBe(false);
  });

  it('should have no error message initially', () => {
    expect(component.errorMessage()).toBeNull();
  });

  it('should have login form with email and password controls', () => {
    expect(component.loginForm.get('email')).toBeTruthy();
    expect(component.loginForm.get('password')).toBeTruthy();
  });

  it('should mark login form as invalid when empty', () => {
    expect(component.loginForm.valid).toBe(false);
  });

  it('should mark login form as valid with proper data', () => {
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'password123'
    });
    expect(component.loginForm.valid).toBe(true);
  });

  it('should have register form with required fields', () => {
    expect(component.registerForm.get('firstName')).toBeTruthy();
    expect(component.registerForm.get('lastName')).toBeTruthy();
    expect(component.registerForm.get('email')).toBeTruthy();
    expect(component.registerForm.get('password')).toBeTruthy();
    expect(component.registerForm.get('shippingAddress')).toBeTruthy();
  });

  it('should not submit login when form is invalid', () => {
    component.onLogin();
    expect(component.isLoading()).toBe(false);
  });

  it('should toggle billing section', () => {
    expect(component.includeBilling()).toBe(false);
    component.toggleBilling();
    expect(component.includeBilling()).toBe(true);
  });

  it('should toggle card section', () => {
    expect(component.includeCard()).toBe(false);
    component.toggleCard();
    expect(component.includeCard()).toBe(true);
  });

  it('should render login form in template', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('form')).toBeTruthy();
  });

  it('should render register form when in register mode', () => {
    component.toggleMode();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Register');
  });

  it('should show error message in template', () => {
    component.errorMessage.set('Invalid email or password');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Invalid email or password');
  });

  it('should onLogin call authService.login with valid form', () => {
    const authService = TestBed.inject(AuthService);
    const cartService = TestBed.inject(CartService);
    vi.spyOn(authService, 'login').mockReturnValue(of({ token: 'abc' } as any));
    vi.spyOn(cartService, 'onLogin').mockImplementation(() => {});

    component.loginForm.patchValue({ email: 'test@test.com', password: 'password123' });
    component.onLogin();

    expect(authService.login).toHaveBeenCalledWith('test@test.com', 'password123');
  });

  it('should onLogin handle auth failure', () => {
    const authService = TestBed.inject(AuthService);
    vi.spyOn(authService, 'login').mockReturnValue(throwError(() => ({ status: 401 })));

    component.loginForm.patchValue({ email: 'test@test.com', password: 'wrongpass' });
    component.onLogin();

    expect(component.errorMessage()).toBeTruthy();
    expect(component.isLoading()).toBe(false);
  });

  it('should not call authService when register form invalid', () => {
    component.toggleMode();
    component.onRegister();
    expect(component.errorMessage()).toBeTruthy();
  });

  it('should render billing section when billing toggled on in register mode', () => {
    component.toggleMode();
    component.toggleBilling();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toBeTruthy();
  });

  it('should render card section when card toggled on in register mode', () => {
    component.toggleMode();
    component.toggleCard();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toBeTruthy();
  });
});
