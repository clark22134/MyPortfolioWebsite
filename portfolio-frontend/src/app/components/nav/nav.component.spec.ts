import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { NavComponent } from './nav.component';
import { AuthService } from '../../services/auth.service';
import { AccessibilityService } from '../../services/accessibility.service';

function makeAuthServiceSpy(isAuth = false) {
  const currentUser$ = new Subject<unknown>();
  return {
    isAuthenticated: vi.fn(() => isAuth),
    currentUser$,
    logout: vi.fn(() => of(undefined))
  };
}

function makeA11ySpy() {
  return {
    announceToScreenReader: vi.fn(),
    speak: vi.fn()
  };
}

describe('NavComponent', () => {
  let component: NavComponent;
  let fixture: ComponentFixture<NavComponent>;
  let authSpy: ReturnType<typeof makeAuthServiceSpy>;
  let a11ySpy: ReturnType<typeof makeA11ySpy>;

  beforeEach(async () => {
    authSpy = makeAuthServiceSpy();
    a11ySpy = makeA11ySpy();

    await TestBed.configureTestingModule({
      imports: [NavComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
        { provide: AccessibilityService, useValue: a11ySpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.classList.remove('nav-menu-open');
    document.body.style.overflow = '';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize isMenuOpen to false', () => {
    expect(component.isMenuOpen).toBe(false);
  });

  it('should set isAuthenticated from authService on init', () => {
    expect(component.isAuthenticated).toBe(false);
    expect(authSpy.isAuthenticated).toHaveBeenCalled();
  });

  it('should toggle menu open and apply modal attributes', () => {
    component.toggleMenu();
    fixture.detectChanges();
    expect(component.isMenuOpen).toBe(true);
    const dialog = fixture.nativeElement.querySelector('#main-nav-menu') as HTMLElement;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-hidden')).toBeNull();
  });

  it('should toggle menu closed when open', () => {
    component.isMenuOpen = true;
    component.toggleMenu();
    expect(component.isMenuOpen).toBe(false);
  });

  it('should close menu via closeMenu()', () => {
    component.isMenuOpen = true;
    component.closeMenu();
    expect(component.isMenuOpen).toBe(false);
  });

  it('should lock and unlock body scroll with menu state', () => {
    component.toggleMenu();
    expect(document.body.classList.contains('nav-menu-open')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    component.closeMenu();
    expect(document.body.classList.contains('nav-menu-open')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('should announceToScreenReader on toggle open', () => {
    component.toggleMenu();
    expect(a11ySpy.announceToScreenReader).toHaveBeenCalledWith('Navigation menu opened');
  });

  it('should announceToScreenReader on toggle close', () => {
    component.isMenuOpen = true;
    component.toggleMenu();
    expect(a11ySpy.announceToScreenReader).toHaveBeenCalledWith('Navigation menu closed');
  });

  it('should close menu on escape key when menu is open', () => {
    component.toggleMenu();
    component.onEscapeKey();
    expect(component.isMenuOpen).toBe(false);
    expect(document.body.classList.contains('nav-menu-open')).toBe(false);
  });

  it('should not close menu on escape key when already closed', () => {
    component.isMenuOpen = false;
    component.onEscapeKey();
    expect(component.isMenuOpen).toBe(false);
  });

  it('should call logout and navigate on handleLogout', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(authSpy, 'logout').mockReturnValue(of(undefined));
    component.handleLogout();
    expect(authSpy.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should speakLink via a11yService', () => {
    component.speakLink('Projects');
    expect(a11ySpy.speak).toHaveBeenCalledWith('Projects');
  });

  it('should render template', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el).toBeTruthy();
  });

  it('should move focus to close button on open and back to toggle on close', () => {
    vi.useFakeTimers();
    const toggleButton = fixture.nativeElement.querySelector('.hamburger-button') as HTMLButtonElement;
    const closeButton = fixture.nativeElement.querySelector('.close-button') as HTMLButtonElement;

    component.toggleMenu();
    fixture.detectChanges();
    vi.advanceTimersByTime(400);
    expect(document.activeElement).toBe(closeButton);

    component.closeMenu();
    fixture.detectChanges();
    vi.advanceTimersByTime(150);
    expect(document.activeElement).toBe(toggleButton);
  });

  it('should trap focus from last element back to first on Tab', () => {
    component.toggleMenu();
    fixture.detectChanges();

    const focusables = fixture.nativeElement.querySelectorAll(
      '.nav-content button, .nav-content a[href], .nav-content [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    last.focus();

    const preventDefault = vi.fn();
    component.onKeyDown({ key: 'Tab', shiftKey: false, preventDefault } as unknown as KeyboardEvent);

    expect(preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(first);
  });

  it('should trap focus from first element back to last on Shift+Tab', () => {
    component.toggleMenu();
    fixture.detectChanges();

    const focusables = fixture.nativeElement.querySelectorAll(
      '.nav-content button, .nav-content a[href], .nav-content [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first.focus();

    const preventDefault = vi.fn();
    component.onKeyDown({ key: 'Tab', shiftKey: true, preventDefault } as unknown as KeyboardEvent);

    expect(preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(last);
  });

  it('should unlock body scroll on destroy when menu is open', () => {
    component.toggleMenu();
    expect(document.body.classList.contains('nav-menu-open')).toBe(true);

    component.ngOnDestroy();
    expect(document.body.classList.contains('nav-menu-open')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });
});
