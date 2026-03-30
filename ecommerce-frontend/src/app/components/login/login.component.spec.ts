import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';

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
});
