import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="hamburger-nav">
      <button class="hamburger-button" (click)="toggleMenu()" [class.active]="isMenuOpen">
        <span class="line"></span>
        <span class="line"></span>
        <span class="line"></span>
      </button>

      <div class="nav-menu" [class.open]="isMenuOpen">
        <div class="nav-overlay" (click)="closeMenu()"></div>
        <div class="nav-content">
          <button class="close-button" (click)="closeMenu()" aria-label="Close menu">
            <span>&times;</span>
          </button>
          <a routerLink="/" (click)="closeMenu()" class="nav-link">
            <span class="nav-icon">🏠</span>
            <span class="nav-text">Home</span>
          </a>
          <a routerLink="/projects" (click)="closeMenu()" class="nav-link">
            <span class="nav-icon">💼</span>
            <span class="nav-text">Angular/Java Projects</span>
          </a>
          <a routerLink="/admin/interactive-projects" (click)="closeMenu()" class="nav-link">
            <span class="nav-icon">🤖</span>
            <span class="nav-text">AI Projects</span>
          </a>
          <a routerLink="/contact" (click)="closeMenu()" class="nav-link">
            <span class="nav-icon">📧</span>
            <span class="nav-text">Contact</span>
          </a>
          <a href="/resume.html" target="_blank" (click)="closeMenu()" class="nav-link">
            <span class="nav-icon">📄</span>
            <span class="nav-text">Resume</span>
          </a>
          <div class="nav-divider"></div>
          <a *ngIf="!isAuthenticated" routerLink="/login" (click)="closeMenu()" class="nav-link auth-link">
            <span class="nav-icon">🔐</span>
            <span class="nav-text">Login</span>
          </a>
          <a *ngIf="isAuthenticated" (click)="handleLogout()" class="nav-link auth-link">
            <span class="nav-icon">🚪</span>
            <span class="nav-text">Logout</span>
          </a>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .hamburger-nav {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2000;
    }

    .hamburger-button {
      width: 50px;
      height: 50px;
      background: rgba(20, 20, 20, 0.95);
      border: 2px solid rgba(0, 204, 51, 0.4);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 6px;
      padding: 0;
      transition: all 0.3s ease;
      box-shadow: 0 0 20px rgba(0, 204, 51, 0.2);
      backdrop-filter: blur(10px);
    }

    .hamburger-button:hover {
      border-color: #00cc33;
      box-shadow: 0 0 30px rgba(0, 204, 51, 0.4);
      transform: translateY(-2px);
    }

    .hamburger-button.active {
      border-color: #00cc33;
      background: rgba(0, 204, 51, 0.2);
    }

    .line {
      width: 25px;
      height: 2px;
      background: #00cc33;
      transition: all 0.3s ease;
      box-shadow: 0 0 5px rgba(0, 204, 51, 0.5);
    }

    .hamburger-button.active .line:nth-child(1) {
      transform: rotate(45deg) translate(7px, 7px);
    }

    .hamburger-button.active .line:nth-child(2) {
      opacity: 0;
    }

    .hamburger-button.active .line:nth-child(3) {
      transform: rotate(-45deg) translate(7px, -7px);
    }

    .nav-menu {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: 0;
      overflow: hidden;
      transition: width 0.3s ease;
    }

    .nav-menu.open {
      width: 100%;
    }

    .nav-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    .nav-menu.open .nav-overlay {
      opacity: 1;
      pointer-events: all;
    }

    .nav-content {
      position: absolute;
      top: 0;
      right: -350px;
      width: 350px;
      height: 100%;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      border-left: 2px solid rgba(0, 204, 51, 0.4);
      padding: 5rem 2rem 2rem;
      transition: right 0.3s ease;
      box-shadow: -5px 0 30px rgba(0, 204, 51, 0.3);
      overflow-y: auto;
    }

    .close-button {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 40px;
      height: 40px;
      background: rgba(20, 20, 20, 0.9);
      border: 2px solid rgba(0, 204, 51, 0.4);
      border-radius: 8px;
      color: #00cc33;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      z-index: 10;
      box-shadow: 0 0 10px rgba(0, 204, 51, 0.2);
    }

    .close-button:hover {
      border-color: #00cc33;
      background: rgba(0, 204, 51, 0.15);
      box-shadow: 0 0 20px rgba(0, 204, 51, 0.4);
      transform: scale(1.1);
    }

    .nav-menu.open .nav-content {
      right: 0;
    }

    .nav-content::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 204, 51, 0.02) 0px,
        transparent 1px,
        transparent 2px,
        rgba(0, 204, 51, 0.02) 3px
      );
      pointer-events: none;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      margin-bottom: 0.75rem;
      background: rgba(0, 204, 51, 0.05);
      border: 1px solid rgba(0, 204, 51, 0.2);
      border-radius: 8px;
      color: #e0e0e0;
      text-decoration: none;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .nav-link::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      width: 3px;
      height: 100%;
      background: #00cc33;
      transform: translateX(-3px);
      transition: transform 0.3s ease;
    }

    .nav-link:hover {
      background: rgba(0, 204, 51, 0.15);
      border-color: #00cc33;
      transform: translateX(5px);
      box-shadow: 0 0 15px rgba(0, 204, 51, 0.3);
    }

    .nav-link:hover::before {
      transform: translateX(0);
    }

    .nav-icon {
      font-size: 1.5rem;
      filter: grayscale(1);
      transition: filter 0.3s ease;
    }

    .nav-link:hover .nav-icon {
      filter: grayscale(0);
    }

    .nav-text {
      font-family: 'Courier New', monospace;
      font-size: 1rem;
      font-weight: 500;
      letter-spacing: 0.5px;
    }

    @media (max-width: 768px) {
      .nav-content {
        width: 280px;
        right: -280px;
      }

      .nav-link {
        padding: 1rem 1.25rem;
      }

      .nav-text {
        font-size: 0.95rem;
      }
    }
    .nav-divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(0, 204, 51, 0.3), transparent);
      margin: 0.5rem 0;
    }

    .auth-link {
      border-top: 1px solid rgba(0, 204, 51, 0.2);
      padding-top: 1rem !important;
      margin-top: 0.5rem;
    }
    @media (max-width: 480px) {
      .nav-content {
        width: 100%;
        right: -100%;
        border-left: none;
      }
    }
  `]
})
export class NavComponent implements OnInit {
  isMenuOpen = false;
  isAuthenticated = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialize with current auth state
    this.isAuthenticated = this.authService.isAuthenticated();
    
    // Subscribe to auth changes
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  handleLogout(): void {
    this.authService.logout();
    this.closeMenu();
    this.router.navigate(['/']);
  }
}
