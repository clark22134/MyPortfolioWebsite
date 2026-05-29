import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { CreateUserRequest, Role, UpdateUserRequest, UserInfo } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = ApiClient.of<UserInfo>('/api/users');

  list(role?: Role): Observable<UserInfo[]> {
    return this.api.list(role ? new HttpParams().set('role', role) : undefined);
  }

  get(id: number): Observable<UserInfo> {
    return this.api.get(id);
  }

  create(request: CreateUserRequest): Observable<UserInfo> {
    return this.api.create(request);
  }

  update(id: number, request: UpdateUserRequest): Observable<UserInfo> {
    return this.api.update(id, request);
  }

  delete(id: number): Observable<void> {
    return this.api.delete(id);
  }
}
