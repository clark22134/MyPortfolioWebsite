import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of, switchMap } from 'rxjs';
import { LoginRequest, RegisterRequest } from '../models/user.model';

/**
 * Authentication service using HTTP-only cookies for JWT storage.
 *
 * Security features:
 * - Access tokens stored in HTTP-only cookies (not accessible to JavaScript)
 * - Refresh tokens with automatic rotation
 * - CSRF protection via X-XSRF-TOKEN header
 * - Short-lived access tokens (15 min) with silent refresh
 */

export interface UserInfo {
  username: string;
  email: string;
  fullName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/auth';
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Timer for automatic token refresh
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  // Access token lifetime in ms (should match backend: 15 min)
  private readonly ACCESS_TOKEN_LIFETIME_MS = 900000;
  // Refresh 1 minute before expiry
  private readonly REFRESH_BUFFER_MS = 60000;

  constructor(private http: HttpClient) {
    // On app initialization, check if user is authenticated via /me endpoint
    this.checkAuthentication();
  }

  /**
   * Check if user is authenticated by calling the /me endpoint.
   * This works because cookies are sent automatically.
   */
  private checkAuthentication(): void {
    this.http.get<UserInfo>(`${this.apiUrl}/me`, { withCredentials: true }).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        this.scheduleTokenRefresh();
      }),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Login with username and password.
   * Tokens are set as HTTP-only cookies by the backend.
   */
  login(credentials: LoginRequest): Observable<UserInfo> {
    return this.http.post<UserInfo>(`${this.apiUrl}/login`, credentials, {
      withCredentials: true
    }).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        this.scheduleTokenRefresh();
      })
    );
  }

  /**
   * Register a new user.
   */
  register(user: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user, {
      withCredentials: true
    });
  }

  /**
   * Logout from current device.
   * Clears cookies via backend response.
   */
  logout(): Observable<any> {
    this.cancelTokenRefresh();
    return this.http.post(`${this.apiUrl}/logout`, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
      }),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      })
    );
  }

  /**
   * Logout from all devices.
   * Revokes all refresh tokens for this user.
   */
  logoutAllDevices(): Observable<any> {
    this.cancelTokenRefresh();
    return this.http.post(`${this.apiUrl}/logout-all`, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
      })
    );
  }

  /**
   * Refresh the access token using the refresh token cookie.
   */
  refreshToken(): Observable<any> {
    return this.http.post(`${this.apiUrl}/refresh`, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.scheduleTokenRefresh();
      }),
      catchError(error => {
        // Refresh failed - user needs to login again
        this.currentUserSubject.next(null);
        this.cancelTokenRefresh();
        return of(null);
      })
    );
  }

  /**
   * Get current user info from the server.
   */
  getCurrentUser(): Observable<UserInfo | null> {
    return this.http.get<UserInfo>(`${this.apiUrl}/me`, {
      withCredentials: true
    }).pipe(
      tap(user => this.currentUserSubject.next(user)),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      })
    );
  }

  /**
   * Check if user is currently authenticated.
   */
  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  /**
   * Schedule automatic token refresh before expiry.
   */
  private scheduleTokenRefresh(): void {
    this.cancelTokenRefresh();

    // Refresh 1 minute before the access token expires
    const refreshTime = this.ACCESS_TOKEN_LIFETIME_MS - this.REFRESH_BUFFER_MS;

    this.refreshTimer = setTimeout(() => {
      this.refreshToken().subscribe();
    }, refreshTime);
  }

  /**
   * Cancel the scheduled token refresh.
   */
  private cancelTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
