import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  token: string;
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
    const stored = this.storage.getItem('authUser');
    if (stored) {
      this.currentUser.set(JSON.parse(stored));
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
      tap(response => {
        this.currentUser.set(response);
        this.storage.setItem('authUser', JSON.stringify(response));
      })
    );
  }

  register(data: RegisterData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', data).pipe(
      tap(response => {
        this.currentUser.set(response);
        this.storage.setItem('authUser', JSON.stringify(response));
      })
    );
  }

  getProfile(): Observable<CustomerProfile> {
    return this.http.get<CustomerProfile>('/api/auth/profile');
  }

  logout(): void {
    this.currentUser.set(null);
    this.storage.removeItem('authUser');
    this.router.navigate(['/products']);
  }

  getToken(): string | null {
    return this.currentUser()?.token ?? null;
  }
}
