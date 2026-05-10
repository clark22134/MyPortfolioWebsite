import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { NavComponent } from './nav.component';
import { AuthService } from '../../services/auth.service';
import { AccessibilityService } from '../../services/accessibility.service';

function makeAuthServiceSpy(isAuth = false) {
  return {
    isAuthenticated: () => isAuth,
    currentUser$: of(null),
    logout: () => of(undefined)
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
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize isMenuOpen to false', () => {
    expect(component.isMenuOpen).toBe(false);
  });

  it('should set isAuthenticated from authService on init', () => {
    expect(component.isAuthenticated).toBe(false);
  });

  it('should toggle menu open', () => {
    component.toggleMenu();
    expect(component.isMenuOpen).toBe(true);
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
    component.isMenuOpen = true;
    component.onEscapeKey();
    expect(component.isMenuOpen).toBe(false);
  });

  it('should not close menu on escape key when already closed', () => {
    component.isMenuOpen = false;
    component.onEscapeKey();
    expect(component.isMenuOpen).toBe(false);
  });

  it('should call logout and navigate on handleLogout', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(authSpy, 'logout').mockReturnValue(of(undefined) as any);
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
});
