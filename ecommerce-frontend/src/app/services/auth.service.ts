import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, of, catchError } from 'rxjs';

export interface AuthResponse {
  email: string;
}

export interface AddressDto {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface CustomerProfile {
  firstName: string;
  lastName: string;
  email: string;
  defaultShippingAddress: AddressDto | null;
  defaultBillingAddress: AddressDto | null;
  cardType: string | null;
  nameOnCard: string | null;
  cardNumberLast4: string | null;
  cardExpirationMonth: number | null;
  cardExpirationYear: number | null;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  shippingAddress: AddressDto;
  billingAddress?: AddressDto;
  cardType?: string;
  nameOnCard?: string;
  cardNumber?: string;
  cardExpirationMonth?: number;
  cardExpirationYear?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private currentUser = signal<AuthResponse | null>(null);
  private http = inject(HttpClient);
  private router = inject(Router);
  private storage: Storage = localStorage;

  isAuthenticated = computed(() => this.currentUser() !== null);
  userEmail = computed(() => this.currentUser()?.email ?? null);

  constructor() {
    // Restore email from localStorage (for UI state only - auth is via HTTP-only cookie)
    const stored = this.storage.getItem('authUser');
    if (stored) {
      try {
        this.currentUser.set(JSON.parse(stored));
      } catch {
        this.storage.removeItem('authUser');
      }
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }, {
      withCredentials: true
    }).pipe(
      tap(response => {
        this.currentUser.set(response);
        this.storage.setItem('authUser', JSON.stringify(response));
      })
    );
  }

  register(data: RegisterData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', data, {
      withCredentials: true
    }).pipe(
      tap(response => {
        this.currentUser.set(response);
        this.storage.setItem('authUser', JSON.stringify(response));
      })
    );
  }

  getProfile(): Observable<CustomerProfile> {
    return this.http.get<CustomerProfile>('/api/auth/profile', { withCredentials: true });
  }

  clearSession(): void {
    this.currentUser.set(null);
    this.storage.removeItem('authUser');
  }

  logout(): void {
    this.http.post('/api/auth/logout', {}, { withCredentials: true }).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.currentUser.set(null);
      this.storage.removeItem('authUser');
      this.router.navigate(['/products']);
    });
  }
}
