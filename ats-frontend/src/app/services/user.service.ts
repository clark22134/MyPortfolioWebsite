import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateUserRequest, Role, UpdateUserRequest, UserInfo } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = '/api/users';

  constructor(private readonly http: HttpClient) {}

  list(role?: Role): Observable<UserInfo[]> {
    let params = new HttpParams();
    if (role) params = params.set('role', role);
    return this.http.get<UserInfo[]>(this.baseUrl, { params });
  }

  get(id: number): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateUserRequest): Observable<UserInfo> {
    return this.http.post<UserInfo>(this.baseUrl, request);
  }

  update(id: number, request: UpdateUserRequest): Observable<UserInfo> {
    return this.http.put<UserInfo>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
