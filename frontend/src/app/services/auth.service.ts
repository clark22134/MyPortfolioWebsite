import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { LoginRequest, RegisterRequest } from '../models/user.model';

/**
 * User information returned from authentication endpoints.
 */
export interface UserInfo {
  username: string;
  email: string;
  fullName: string;
}

/**
 * Authentication service using HTTP-only cookies for secure JWT storage.
 *
 * Security features:
 * - Access tokens stored in HTTP-only cookies (prevents XSS attacks)
 * - Refresh tokens with automatic rotation
 * - CSRF protection via X-XSRF-TOKEN header
 * - Short-lived access tokens (15 min) with silent refresh
 * - Automatic token refresh before expiration
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private static readonly API_URL = '/api/auth';
  private static readonly ACCESS_TOKEN_LIFETIME_MS = 900000; // 15 minutes
  private static readonly REFRESH_BUFFER_MS = 60000; // 1 minute before expiry

  private readonly currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  public readonly currentUser$ = this.currentUserSubject.asObservable();

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly http: HttpClient) {
    this.initializeAuthState();
  }

  ngOnDestroy(): void {
    this.cancelTokenRefresh();
  }

  // ========== Public API ==========

  /**
   * Authenticate user with username and password.
   * Tokens are automatically stored in HTTP-only cookies by the backend.
   */
  login(credentials: LoginRequest): Observable<UserInfo> {
    return this.http.post<UserInfo>(
      `${AuthService.API_URL}/login`,
      credentials,
      { withCredentials: true }
    ).pipe(
      tap(user => this.handleSuccessfulAuth(user))
    );
  }

  /**
   * Register a new user account.
   */
  register(user: RegisterRequest): Observable<unknown> {
    return this.http.post(
      `${AuthService.API_URL}/register`,
      user,
      { withCredentials: true }
    );
  }

  /**
   * Logout from the current device.
   * Clears authentication cookies via backend response.
   */
  logout(): Observable<unknown> {
    this.cancelTokenRefresh();
    return this.http.post(
      `${AuthService.API_URL}/logout`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.clearAuthState()),
      catchError(() => {
        this.clearAuthState();
        return of(null);
      })
    );
  }

  /**
   * Logout from all devices.
   * Revokes all refresh tokens associated with this user.
   */
  logoutAllDevices(): Observable<unknown> {
    this.cancelTokenRefresh();
    return this.http.post(
      `${AuthService.API_URL}/logout-all`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.clearAuthState())
    );
  }

  /**
   * Refresh the access token using the refresh token cookie.
   * Called automatically before token expiration.
   */
  refreshToken(): Observable<unknown> {
    return this.http.post(
      `${AuthService.API_URL}/refresh`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.scheduleTokenRefresh()),
      catchError(() => {
        this.clearAuthState();
        return of(null);
      })
    );
  }

  /**
   * Get current authenticated user information from the server.
   */
  getCurrentUser(): Observable<UserInfo | null> {
    return this.http.get<UserInfo>(
      `${AuthService.API_URL}/me`,
      { withCredentials: true }
    ).pipe(
      tap(user => this.currentUserSubject.next(user)),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      })
    );
  }

  /**
   * Check if a user is currently authenticated.
   */
  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  // ========== Private Methods ==========

  private initializeAuthState(): void {
    this.http.get<UserInfo>(
      `${AuthService.API_URL}/me`,
      { withCredentials: true }
    ).pipe(
      tap(user => this.handleSuccessfulAuth(user)),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      })
    ).subscribe();
  }

  private handleSuccessfulAuth(user: UserInfo): void {
    this.currentUserSubject.next(user);
    this.scheduleTokenRefresh();
  }

  private clearAuthState(): void {
    this.currentUserSubject.next(null);
    this.cancelTokenRefresh();
  }

  private scheduleTokenRefresh(): void {
    this.cancelTokenRefresh();

    const refreshTime = AuthService.ACCESS_TOKEN_LIFETIME_MS - AuthService.REFRESH_BUFFER_MS;
    this.refreshTimer = setTimeout(() => {
      this.refreshToken().subscribe();
    }, refreshTime);
  }

  private cancelTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
