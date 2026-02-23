import { Component, OnInit, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AccessibilityService } from '../../services/accessibility.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="hamburger-nav" role="navigation" aria-label="Main navigation">
      <button
        class="hamburger-button"
        (click)="toggleMenu()"
        [class.active]="isMenuOpen"
        [attr.aria-expanded]="isMenuOpen"
        aria-controls="main-nav-menu"
        aria-label="Toggle navigation menu"
        #menuToggleBtn>
        <span class="line" aria-hidden="true"></span>
        <span class="line" aria-hidden="true"></span>
        <span class="line" aria-hidden="true"></span>
      </button>

      <div class="nav-menu"
           id="main-nav-menu"
           [class.open]="isMenuOpen"
           role="dialog"
           aria-label="Navigation menu"
           [attr.aria-hidden]="!isMenuOpen">
        <div class="nav-overlay" (click)="closeMenu()" aria-hidden="true"></div>
        <div class="nav-content" #navContent>
          <button
            class="close-button"
            (click)="closeMenu()"
            aria-label="Close navigation menu"
            #closeBtn>
            <span aria-hidden="true">&times;</span>
          </button>
          <ul role="list" class="nav-list">
            <li>
              <a routerLink="/" (click)="closeMenu()" class="nav-link" (mouseenter)="speakLink('Home')">
                <span class="nav-icon" aria-hidden="true">🏠</span>
                <span class="nav-text">Home</span>
              </a>
            </li>
            <li>
              <a routerLink="/projects" (click)="closeMenu()" class="nav-link" (mouseenter)="speakLink('Angular Java Projects')">
                <span class="nav-icon" aria-hidden="true">💼</span>
                <span class="nav-text">Angular/Java Projects</span>
              </a>
            </li>
            <li>
              <a routerLink="/admin/interactive-projects" (click)="closeMenu()" class="nav-link" (mouseenter)="speakLink('AI Projects')">
                <span class="nav-icon" aria-hidden="true">🤖</span>
                <span class="nav-text">AI Projects</span>
              </a>
            </li>
            <li>
              <a routerLink="/contact" (click)="closeMenu()" class="nav-link" (mouseenter)="speakLink('Contact')">
                <span class="nav-icon" aria-hidden="true">📧</span>
                <span class="nav-text">Contact</span>
              </a>
            </li>
            <li>
              <a routerLink="/accessibility" (click)="closeMenu()" class="nav-link" (mouseenter)="speakLink('Accessibility Statement')">
                <span class="nav-icon" aria-hidden="true">♿</span>
                <span class="nav-text">Accessibility</span>
              </a>
            </li>
            <li>
              <a href="/resume.html" target="_blank" rel="noopener noreferrer" (click)="closeMenu()" class="nav-link" (mouseenter)="speakLink('Resume, opens in new tab')">
                <span class="nav-icon" aria-hidden="true">📄</span>
                <span class="nav-text">Resume<span class="sr-only"> (opens in new tab)</span></span>
              </a>
            </li>
          </ul>
          <div class="nav-divider" role="separator" aria-hidden="true"></div>
          <a *ngIf="!isAuthenticated" routerLink="/login" (click)="closeMenu()" class="nav-link auth-link">
            <span class="nav-icon" aria-hidden="true">🔐</span>
            <span class="nav-text">Login</span>
          </a>
          <a *ngIf="isAuthenticated" (click)="handleLogout()" class="nav-link auth-link" role="button" tabindex="0"
             (keydown.enter)="handleLogout()" (keydown.space)="handleLogout()">
            <span class="nav-icon" aria-hidden="true">🚪</span>
            <span class="nav-text">Logout</span>
          </a>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    /* Screen-reader-only utility */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .nav-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

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

    .hamburger-button:hover,
    .hamburger-button:focus-visible {
      border-color: #00cc33;
      box-shadow: 0 0 30px rgba(0, 204, 51, 0.4);
      transform: translateY(-2px);
      outline: 3px solid #00ff41;
      outline-offset: 2px;
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

    .close-button:hover,
    .close-button:focus-visible {
      border-color: #00cc33;
      background: rgba(0, 204, 51, 0.15);
      box-shadow: 0 0 20px rgba(0, 204, 51, 0.4);
      transform: scale(1.1);
      outline: 3px solid #00ff41;
      outline-offset: 2px;
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

    .nav-link:hover,
    .nav-link:focus-visible {
      background: rgba(0, 204, 51, 0.15);
      border-color: #00cc33;
      transform: translateX(5px);
      box-shadow: 0 0 15px rgba(0, 204, 51, 0.3);
      outline: 3px solid #00ff41;
      outline-offset: 2px;
    }

    .nav-link:hover::before,
    .nav-link:focus-visible::before {
      transform: translateX(0);
    }

    .nav-icon {
      font-size: 1.5rem;
      filter: grayscale(1);
      transition: filter 0.3s ease;
    }

    .nav-link:hover .nav-icon,
    .nav-link:focus-visible .nav-icon {
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
export class NavComponent implements OnInit, AfterViewInit {
  isMenuOpen = false;
  isAuthenticated = false;

  @ViewChild('menuToggleBtn') menuToggleBtn!: ElementRef;
  @ViewChild('closeBtn') closeBtn!: ElementRef;
  @ViewChild('navContent') navContent!: ElementRef;

  constructor(
    private authService: AuthService,
    private router: Router,
    private a11yService: AccessibilityService
  ) {}

  ngOnInit(): void {
    // Initialize with current auth state
    this.isAuthenticated = this.authService.isAuthenticated();

    // Subscribe to auth changes
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  ngAfterViewInit(): void {
    // Keyboard trap: keep focus within the nav when open
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.a11yService.announceToScreenReader('Navigation menu opened');
      // Focus the close button after menu opens
      setTimeout(() => {
        this.closeBtn?.nativeElement?.focus();
      }, 350);
    } else {
      this.a11yService.announceToScreenReader('Navigation menu closed');
    }
  }

  closeMenu(): void {
    this.isMenuOpen = false;
    this.a11yService.announceToScreenReader('Navigation menu closed');
    // Return focus to the toggle button
    setTimeout(() => {
      this.menuToggleBtn?.nativeElement?.focus();
    }, 100);
  }

  handleLogout(): void {
    this.authService.logout();
    this.closeMenu();
    this.router.navigate(['/']);
    this.a11yService.announceToScreenReader('Logged out successfully');
  }

  speakLink(text: string): void {
    this.a11yService.speak(text);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isMenuOpen) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isMenuOpen || !this.navContent) return;

    if (event.key === 'Tab') {
      // Focus trap within the navigation menu
      const focusableElements = this.navContent.nativeElement.querySelectorAll(
        'a[href], button, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0] as HTMLElement;
      const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }
}
