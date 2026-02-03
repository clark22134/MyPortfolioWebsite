import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/user.model';
import { NavComponent } from '../nav/nav.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, NavComponent],
  template: `
    <app-nav></app-nav>
    
    <div class="login-container">
      <!-- Cyber Logo -->
      <div class="cyber-logo">
        <div class="logo-icon">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <!-- Terminal window -->
            <rect x="10" y="20" width="80" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
            <line x1="10" y1="30" x2="90" y2="30" stroke="currentColor" stroke-width="2"/>
            <!-- Terminal prompt -->
            <text x="18" y="48" font-family="monospace" font-size="12" fill="currentColor">&gt;_</text>
            <!-- Code lines -->
            <line x1="35" y1="45" x2="70" y2="45" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="35" y1="55" x2="60" y2="55" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="35" y1="65" x2="75" y2="65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="logo-text">
          <span class="logo-prefix">{{ isAuthenticated ? 'root' : 'user' }}&#64;</span><span class="logo-host">portfolio</span>
        </div>
        <div class="scan-line"></div>
      </div>

      <div class="login-card">
        <h2>Login for Interactive Projects</h2>
        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label for="username">Username</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              [(ngModel)]="credentials.username" 
              required
              placeholder="Enter your username"
              class="form-control"
            >
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              [(ngModel)]="credentials.password" 
              required
              placeholder="Enter your password"
              class="form-control"
            >
          </div>
          <div *ngIf="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
          <button type="submit" class="btn-submit" [disabled]="!loginForm.valid || loading">
            {{ loading ? 'Logging in...' : 'Login' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: calc(100vh - 60px);
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      padding: 2rem;
    }

    .login-card {
      background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
      border-radius: 12px;
      padding: 3rem;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      max-width: 400px;
      width: 100%;
      border: 1px solid rgba(255,255,255,0.1);
    }

    h2 {
      text-align: center;
      color: #ffffff;
      margin-bottom: 2rem;
      font-weight: 600;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #e0e0e0;
      font-weight: 600;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 0.05);
      color: #ffffff;
    }

    .form-control:focus {
      outline: none;
      border-color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }

    .error-message {
      background: #fee;
      color: #c33;
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      text-align: center;
    }

    .btn-submit {
      width: 100%;
      padding: 0.75rem;
      background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
      color: #1a1a1a;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 0 20px rgba(255,255,255,0.3);
    }

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(255,255,255,0.5);
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .auth-button {
      position: fixed;
      top: 20px;
      left: 160px;
      z-index: 1001;
      padding: 8px 16px;
      background: rgba(20, 20, 20, 0.85);
      border: 2px solid rgba(0, 204, 51, 0.4);
      border-radius: 6px;
      color: #00cc33;
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      backdrop-filter: blur(10px);
      box-shadow: 0 0 20px rgba(0, 204, 51, 0.2);
      transition: all 0.3s ease;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .auth-button:hover {
      border-color: rgba(0, 204, 51, 0.7);
      box-shadow: 0 0 30px rgba(0, 204, 51, 0.4);
      transform: translateY(-2px);
      background: rgba(0, 204, 51, 0.1);
    }

    .cyber-logo {
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 8px;
      background: rgba(20, 20, 20, 0.85);
      border: 2px solid rgba(0, 204, 51, 0.4);
      border-radius: 8px;
      backdrop-filter: blur(10px);
      box-shadow: 
        0 0 20px rgba(0, 204, 51, 0.2),
        inset 0 0 20px rgba(0, 204, 51, 0.05);
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .cyber-logo:hover {
      border-color: rgba(0, 204, 51, 0.7);
      box-shadow: 
        0 0 30px rgba(0, 204, 51, 0.4),
        inset 0 0 20px rgba(0, 204, 51, 0.1);
      transform: translateY(-2px);
    }

    .logo-icon {
      width: 38px;
      height: 38px;
      color: #00cc33;
      animation: pulse 3s ease-in-out infinite;
      filter: drop-shadow(0 0 8px rgba(0, 204, 51, 0.5));
    }

    .logo-icon svg {
      width: 100%;
      height: 100%;
    }

    .logo-text {
      font-family: 'Courier New', monospace;
      font-size: 0.68rem;
      color: #00cc33;
      text-shadow: 0 0 5px rgba(0, 204, 51, 0.5);
      letter-spacing: 1px;
    }

    .logo-prefix {
      color: #808080;
    }

    .logo-host {
      color: #00cc33;
      font-weight: 600;
    }

    .scan-line {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #00cc33, transparent);
      animation: scanMove 2s linear infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        filter: drop-shadow(0 0 8px rgba(0, 204, 51, 0.5));
      }
      50% {
        opacity: 0.8;
        filter: drop-shadow(0 0 15px rgba(0, 204, 51, 0.7));
      }
    }

    @keyframes scanMove {
      0% {
        transform: translateY(0);
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      100% {
        transform: translateY(-80px);
        opacity: 0;
      }
    }  `]
})
export class LoginComponent {
  credentials: LoginRequest = { username: '', password: '' };
  errorMessage = '';
  loading = false;
  isAuthenticated = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  onSubmit(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/admin/interactive-projects']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = 'Invalid username or password';
        console.error('Login error', error);
      }
    });
  }
}
