import { Component, OnInit, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AccessibilityService } from '../../services/accessibility.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
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
