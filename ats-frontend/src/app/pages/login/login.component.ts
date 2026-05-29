import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

interface DemoAccount {
  username: string;
  password: string;
  role: string;
  description: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly demoAccounts: DemoAccount[] = [
    { username: 'admin',     password: 'admin123',     role: 'Administrator',  description: 'Full access including user management' },
    { username: 'recruiter', password: 'recruiter123', role: 'Recruiter',      description: 'Read/write candidates, jobs, pipeline, tasks' },
    { username: 'manager',   password: 'manager123',   role: 'Hiring Manager', description: 'Read-only access; add notes and complete assigned tasks' }
  ];

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toast: ToastService
  ) {}

  submit(): void {
    if (!this.username || !this.password) {
      this.error.set('Username and password are required.');
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: user => {
        this.submitting.set(false);
        this.toast.success(`Welcome, ${user.fullName}`);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: err => {
        this.submitting.set(false);
        const message = err?.error?.error ?? 'Sign-in failed. Please try again.';
        this.error.set(message);
      }
    });
  }

  fill(account: DemoAccount): void {
    this.username = account.username;
    this.password = account.password;
    this.error.set(null);
  }
}
