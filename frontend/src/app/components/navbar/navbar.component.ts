import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar">
      <div class="navbar-container">
        <a routerLink="/" class="navbar-brand">My Portfolio</a>
        <div class="navbar-menu">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Home</a>
          <a routerLink="/projects" routerLinkActive="active">Projects</a>
          <a href="https://github.com/clark22134" target="_blank">GitHub</a>
          <a *ngIf="!isAuthenticated()" routerLink="/login" routerLinkActive="active" class="login-btn">Login</a>
          <button *ngIf="isAuthenticated()" (click)="logout()" class="logout-btn">Logout</button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .navbar-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .navbar-brand {
      font-size: 1.5rem;
      font-weight: bold;
      color: white;
      text-decoration: none;
      transition: opacity 0.3s;
    }

    .navbar-brand:hover {
      opacity: 0.8;
    }

    .navbar-menu {
      display: flex;
      gap: 2rem;
      align-items: center;
    }

    .navbar-menu a, .navbar-menu button {
      color: white;
      text-decoration: none;
      font-weight: 500;
      transition: opacity 0.3s;
      padding: 0.5rem 1rem;
      border-radius: 4px;
    }

    .navbar-menu a:hover {
      opacity: 0.8;
      background: rgba(255, 255, 255, 0.1);
    }

    .navbar-menu a.active {
      background: rgba(255, 255, 255, 0.2);
    }

    .login-btn, .logout-btn {
      background: white;
      color: #667eea;
      padding: 0.5rem 1.5rem;
      border-radius: 25px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .login-btn:hover, .logout-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
  `]
})
export class NavbarComponent {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
