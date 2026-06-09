import { Component, OnDestroy, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
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
export class NavComponent implements OnInit, OnDestroy {
  isMenuOpen = false;
  isAuthenticated = false;

  @ViewChild('menuToggleBtn') menuToggleBtn!: ElementRef<HTMLElement>;
  @ViewChild('closeBtn') closeBtn!: ElementRef<HTMLElement>;
  @ViewChild('navContent') navContent!: ElementRef<HTMLElement>;
  private previousBodyOverflow = '';
  private bodyScrollLocked = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly a11yService: AccessibilityService
  ) {}

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isAuthenticated();

    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  toggleMenu(): void {
    this.setMenuState(!this.isMenuOpen);
  }

  closeMenu(): void {
    this.setMenuState(false, true);
  }

  handleLogout(): void {
    this.authService.logout().subscribe();
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

    if (event.key !== 'Tab') return;

    // Focus trap within the navigation menu
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstFocusable) {
      event.preventDefault();
      lastFocusable.focus();
    } else if (!event.shiftKey && document.activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  }

  private setMenuState(open: boolean, restoreFocus = false): void {
    if (this.isMenuOpen === open) {
      if (!open) {
        this.unlockBodyScroll();
      }
      return;
    }

    this.isMenuOpen = open;

    if (open) {
      this.lockBodyScroll();
      this.a11yService.announceToScreenReader('Navigation menu opened');
      setTimeout(() => {
        this.closeBtn?.nativeElement?.focus();
      }, 350);
      return;
    }

    this.unlockBodyScroll();
    this.a11yService.announceToScreenReader('Navigation menu closed');

    if (restoreFocus) {
      setTimeout(() => {
        this.menuToggleBtn?.nativeElement?.focus();
      }, 100);
    }
  }

  private getFocusableElements(): HTMLElement[] {
    const nodeList = this.navContent.nativeElement.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    return Array.from(nodeList).filter((element): element is HTMLElement => element instanceof HTMLElement);
  }

  private lockBodyScroll(): void {
    if (this.bodyScrollLocked) return;

    this.previousBodyOverflow = document.body.style.overflow;
    document.body.classList.add('nav-menu-open');
    document.body.style.overflow = 'hidden';
    this.bodyScrollLocked = true;
  }

  private unlockBodyScroll(): void {
    if (!this.bodyScrollLocked) return;

    document.body.classList.remove('nav-menu-open');
    document.body.style.overflow = this.previousBodyOverflow;
    this.bodyScrollLocked = false;
  }
}
