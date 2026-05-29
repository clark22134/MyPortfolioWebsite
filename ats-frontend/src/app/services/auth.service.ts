import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { LoginRequest, Role, UserInfo } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = '/api/auth';

  private readonly _currentUser = signal<UserInfo | null>(null);
  private readonly _initialized = signal(false);
  readonly currentUser = this._currentUser.asReadonly();
  readonly initialized = this._initialized.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly role = computed(() => this._currentUser()?.role ?? null);

  constructor(private readonly http: HttpClient) {}

  /** Called once on app boot to hydrate from the auth cookie. */
  bootstrap(): Observable<UserInfo | null> {
    return this.http.get<UserInfo>(`${this.baseUrl}/me`).pipe(
      tap(user => this._currentUser.set(user)),
      catchError(() => {
        this._currentUser.set(null);
        return of(null);
      }),
      tap(() => this._initialized.set(true))
    );
  }

  login(request: LoginRequest): Observable<UserInfo> {
    return this.http.post<UserInfo>(`${this.baseUrl}/login`, request, { withCredentials: true })
      .pipe(tap(user => this._currentUser.set(user)));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {}, { withCredentials: true })
      .pipe(tap(() => this._currentUser.set(null)));
  }

  refresh(): Observable<UserInfo | null> {
    return this.http.post<UserInfo>(`${this.baseUrl}/refresh`, {}, { withCredentials: true })
      .pipe(
        tap(user => this._currentUser.set(user)),
        catchError(() => {
          this._currentUser.set(null);
          return of(null);
        })
      );
  }

  /** Convenience: true if the current user holds *any* of the given roles. */
  hasAnyRole(...roles: Role[]): boolean {
    const current = this._currentUser()?.role;
    if (!current) return false;
    return roles.includes(current);
  }

  /** True for ADMIN or RECRUITER — i.e. anyone who can mutate operational data. */
  canWrite(): boolean {
    return this.hasAnyRole('ADMIN', 'RECRUITER');
  }

  isAdmin(): boolean {
    return this.hasAnyRole('ADMIN');
  }

  /** Used by the route guard. Returns a synchronous boolean once `bootstrap()` has run. */
  isAuthenticatedSync(): boolean {
    return this._currentUser() !== null;
  }

  /** Wait for bootstrap to complete (resolves to whether user is authenticated). */
  whenReady(): Observable<boolean> {
    if (this._initialized()) {
      return of(this.isAuthenticatedSync());
    }
    return this.bootstrap().pipe(map(() => this.isAuthenticatedSync()));
  }
}
