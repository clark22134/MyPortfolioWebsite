import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { LoginRequest, LoginResponse, RegisterRequest } from '../models/user.model';

/**
 * SECURITY NOTE: This service stores JWT tokens in memory and sessionStorage.
 *
 * For maximum security in production, consider:
 * 1. Using HttpOnly cookies set by the backend (requires backend changes)
 * 2. Implementing token refresh with short-lived access tokens
 * 3. Adding CSRF protection if using cookies
 *
 * Current implementation uses sessionStorage (cleared on browser close) instead
 * of localStorage for improved security against persistent XSS attacks.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/auth';
  private currentUserSubject = new BehaviorSubject<LoginResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // In-memory token storage (primary) - cleared on page refresh
  private tokenCache: string | null = null;

  constructor(private http: HttpClient) {
    // Use sessionStorage instead of localStorage for better security
    // sessionStorage is cleared when the browser tab is closed
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        this.currentUserSubject.next(parsed);
        this.tokenCache = parsed?.token || null;
      } catch (e) {
        // Invalid stored data - clear it
        sessionStorage.removeItem('currentUser');
      }
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        // Store in memory first (most secure)
        this.tokenCache = response.token;
        // Store in sessionStorage for tab persistence (cleared on browser close)
        sessionStorage.setItem('currentUser', JSON.stringify(response));
        this.currentUserSubject.next(response);
      })
    );
  }

  register(user: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  logout(): void {
    this.tokenCache = null;
    sessionStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  getToken(): string | null {
    // Prefer in-memory token, fallback to sessionStorage
    if (this.tokenCache) {
      return this.tokenCache;
    }
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        this.tokenCache = parsed?.token || null;
        return this.tokenCache;
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}
