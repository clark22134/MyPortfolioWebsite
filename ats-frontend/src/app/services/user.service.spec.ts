import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { UserInfo } from '../models/ats.models';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  const user: UserInfo = {
    id: 1, username: 'alice', email: 'a@b.com', fullName: 'Alice',
    role: 'RECRUITER', enabled: true, createdAt: '2026-01-01', lastLoginAt: null
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists users', () => {
    service.list().subscribe();
    httpMock.expectOne('/api/users').flush([user]);
  });

  it('lists users by role', () => {
    service.list('ADMIN').subscribe();
    httpMock.expectOne('/api/users?role=ADMIN').flush([]);
  });

  it('get / create / update / delete', () => {
    service.get(1).subscribe();
    httpMock.expectOne('/api/users/1').flush(user);
    service.create({ username: 'b', password: 'longenough1', email: 'b@b.com', fullName: 'Bob', role: 'RECRUITER' }).subscribe();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/users').flush(user);
    service.update(1, { email: 'x@x.com', fullName: 'X', role: 'ADMIN', enabled: false }).subscribe();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/users/1').flush(user);
    service.delete(1).subscribe();
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/users/1').flush(null);
  });
});
