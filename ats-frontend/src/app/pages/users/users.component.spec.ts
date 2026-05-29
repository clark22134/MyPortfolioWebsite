import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { UsersComponent } from './users.component';
import { UserInfo } from '../../models/ats.models';

describe('UsersComponent', () => {
  let httpMock: HttpTestingController;

  const user: UserInfo = {
    id: 1, username: 'alice', email: 'a@b.com', fullName: 'Alice',
    role: 'RECRUITER', enabled: true, createdAt: '2026-01-01', lastLoginAt: null
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('renders users', () => {
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/users').flush([user]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('alice');
  });

  it('shows empty state', () => {
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/users').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No users yet');
  });

  it('toggleEnabled sends PUT', () => {
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/users').flush([user]);
    fixture.componentInstance.toggleEnabled(user);
    const r = httpMock.expectOne('/api/users/1');
    expect(r.request.method).toBe('PUT');
    expect(r.request.body.enabled).toBe(false);
    r.flush({ ...user, enabled: false });
  });

  it('changeRole sends PUT with new role', () => {
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/users').flush([user]);
    fixture.componentInstance.changeRole(user, 'ADMIN');
    const r = httpMock.expectOne('/api/users/1');
    expect(r.request.body.role).toBe('ADMIN');
    r.flush({ ...user, role: 'ADMIN' });
  });
});
