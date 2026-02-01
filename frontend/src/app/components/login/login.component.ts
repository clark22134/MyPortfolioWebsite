import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h2>Login to Your Account</h2>
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
  `]
})
export class LoginComponent {
  credentials: LoginRequest = { username: '', password: '' };
  errorMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

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
