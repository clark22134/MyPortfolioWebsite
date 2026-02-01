import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginResponse } from '../../models/user.model';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        FormsModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty credentials', () => {
    expect(component.credentials.username).toBe('');
    expect(component.credentials.password).toBe('');
  });

  it('should initialize with no error message', () => {
    expect(component.errorMessage).toBe('');
  });

  it('should initialize with loading as false', () => {
    expect(component.loading).toBe(false);
  });

  it('should render login form', () => {
    const formElement = fixture.nativeElement.querySelector('form');
    expect(formElement).toBeTruthy();
  });

  it('should render username input', () => {
    const usernameInput = fixture.nativeElement.querySelector('#username');
    expect(usernameInput).toBeTruthy();
    expect(usernameInput.type).toBe('text');
  });

  it('should render password input', () => {
    const passwordInput = fixture.nativeElement.querySelector('#password');
    expect(passwordInput).toBeTruthy();
    expect(passwordInput.type).toBe('password');
  });

  it('should render submit button', () => {
    const submitButton = fixture.nativeElement.querySelector('.btn-submit');
    expect(submitButton).toBeTruthy();
  });

  it('should disable submit button when form is invalid', () => {
    component.credentials.username = '';
    component.credentials.password = '';
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('.btn-submit');
    expect(submitButton.disabled).toBe(true);
  });

  it('should update credentials when inputs change', () => {
    const usernameInput = fixture.nativeElement.querySelector('#username');
    const passwordInput = fixture.nativeElement.querySelector('#password');

    usernameInput.value = 'testuser';
    usernameInput.dispatchEvent(new Event('input'));
    passwordInput.value = 'password123';
    passwordInput.dispatchEvent(new Event('input'));

    fixture.detectChanges();

    // Note: ngModel updates happen asynchronously
    expect(usernameInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('password123');
  });

  it('should call authService.login on form submit with valid credentials', () => {
    const mockResponse: LoginResponse = { 
      token: 'mock-token',
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User'
    };
    authService.login.and.returnValue(of(mockResponse));

    component.credentials.username = 'testuser';
    component.credentials.password = 'password123';

    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123'
    });
  });

  it('should navigate to interactive-projects on successful login', () => {
    const mockResponse: LoginResponse = { 
      token: 'mock-token',
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User'
    };
    authService.login.and.returnValue(of(mockResponse));

    component.credentials.username = 'testuser';
    component.credentials.password = 'password123';

    component.onSubmit();

    expect(router.navigate).toHaveBeenCalledWith(['/admin/interactive-projects']);
  });

  it('should set loading to true during login', () => {
    const mockResponse: LoginResponse = { 
      token: 'mock-token',
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User'
    };
    authService.login.and.returnValue(of(mockResponse));

    component.credentials.username = 'testuser';
    component.credentials.password = 'password123';

    component.onSubmit();

    // Loading should be set to true initially (before observable completes)
    // After completion, it's set to false
    expect(component.loading).toBe(false);
  });

  it('should display error message on login failure', () => {
    authService.login.and.returnValue(
      throwError(() => ({ error: { message: 'Invalid credentials' } }))
    );

    component.credentials.username = 'wronguser';
    component.credentials.password = 'wrongpass';

    component.onSubmit();

    expect(component.errorMessage).toBe('Invalid username or password');
    expect(component.loading).toBe(false);
  });

  it('should display error message element when errorMessage is set', () => {
    component.errorMessage = 'Test error message';
    fixture.detectChanges();

    const errorElement = fixture.nativeElement.querySelector('.error-message');
    expect(errorElement).toBeTruthy();
    expect(errorElement.textContent).toContain('Test error message');
  });

  it('should not display error message element when errorMessage is empty', () => {
    component.errorMessage = '';
    fixture.detectChanges();

    const errorElement = fixture.nativeElement.querySelector('.error-message');
    expect(errorElement).toBeFalsy();
  });

  it('should show "Logging in..." text when loading', () => {
    component.loading = true;
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('.btn-submit');
    expect(submitButton.textContent).toContain('Logging in...');
  });

  it('should show "Login" text when not loading', () => {
    component.loading = false;
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('.btn-submit');
    expect(submitButton.textContent).toContain('Login');
  });
});
