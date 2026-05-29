import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('shows demo accounts', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('admin');
    expect(fixture.nativeElement.textContent).toContain('recruiter');
    expect(fixture.nativeElement.textContent).toContain('manager');
  });

  it('error when fields blank', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toContain('required');
  });

  it('successful login navigates to returnUrl', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.username = 'alice'; c.password = 'pw';
    const navSpy = vi.spyOn(router, 'navigateByUrl');
    c.submit();
    httpMock.expectOne('/api/auth/login').flush({
      id: 1, username: 'alice', email: 'a@b.com', fullName: 'Alice',
      role: 'RECRUITER', enabled: true, createdAt: '2026-01-01', lastLoginAt: null
    });
    expect(navSpy).toHaveBeenCalled();
  });

  it('failed login shows error', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.username = 'alice'; c.password = 'wrong';
    c.submit();
    httpMock.expectOne('/api/auth/login').flush({ error: 'bad creds' }, { status: 401, statusText: 'Unauthorized' });
    expect(c.error()).toBe('bad creds');
  });

  it('fill() populates form fields', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const c = fixture.componentInstance;
    c.fill(c.demoAccounts[0]);
    expect(c.username).toBe('admin');
    expect(c.password).toBe('admin123');
  });
});

declare const vi: typeof import('vitest').vi;
