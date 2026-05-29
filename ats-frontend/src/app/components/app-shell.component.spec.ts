import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppShellComponent } from './app-shell.component';
import { AuthService } from '../services/auth.service';
import { UserInfo } from '../models/ats.models';

describe('AppShellComponent', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;

  const recruiter: UserInfo = {
    id: 1, username: 'alice', email: 'a@b.com', fullName: 'Alice Recruiter',
    role: 'RECRUITER', enabled: true, createdAt: '2026-01-01', lastLoginAt: null
  };
  const admin: UserInfo = { ...recruiter, id: 2, username: 'admin', fullName: 'Admin User', role: 'ADMIN' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => httpMock.verify());

  it('hides Users link for recruiter', () => {
    auth['_currentUser'].set(recruiter);
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Users');
    expect(fixture.nativeElement.textContent).toContain('Dashboard');
  });

  it('shows Users link for admin', () => {
    auth['_currentUser'].set(admin);
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Users');
  });

  it('user initials are computed from full name', () => {
    auth['_currentUser'].set(recruiter);
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.userInitials()).toBe('AR');
  });
});
