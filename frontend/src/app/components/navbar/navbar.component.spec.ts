import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../services/auth.service';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'logout']);

    await TestBed.configureTestingModule({
      imports: [
        NavbarComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render navbar', () => {
    const navElement = fixture.nativeElement.querySelector('.navbar');
    expect(navElement).toBeTruthy();
  });

  it('should display brand name', () => {
    const brandElement = fixture.nativeElement.querySelector('.navbar-brand');
    expect(brandElement).toBeTruthy();
    expect(brandElement.textContent).toContain('My Portfolio');
  });

  it('should display Home link', () => {
    const navLinks = fixture.nativeElement.querySelectorAll('a[routerLink="/"]');
    const homeLink = Array.from(navLinks).find((link: any) => link.textContent.includes('Home'));
    expect(homeLink).toBeTruthy();
  });

  it('should display Projects link', () => {
    const projectsLink = fixture.nativeElement.querySelector('a[routerLink="/projects"]');
    expect(projectsLink).toBeTruthy();
    expect(projectsLink.textContent).toContain('Projects');
  });

  it('should display Resume link', () => {
    const resumeLink = fixture.nativeElement.querySelector('a[href="/resume.html"]');
    expect(resumeLink).toBeTruthy();
    expect(resumeLink.textContent).toContain('Resume');
    expect(resumeLink.target).toBe('_blank');
  });

  it('should display GitHub link', () => {
    const githubLink = fixture.nativeElement.querySelector('a[href="https://github.com/clark22134"]');
    expect(githubLink).toBeTruthy();
    expect(githubLink.textContent).toContain('GitHub');
    expect(githubLink.target).toBe('_blank');
  });

  it('should call authService.isAuthenticated', () => {
    authService.isAuthenticated.and.returnValue(false);
    
    const result = component.isAuthenticated();

    expect(authService.isAuthenticated).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('should show Login button when not authenticated', () => {
    authService.isAuthenticated.and.returnValue(false);
    fixture.detectChanges();

    const loginButton = fixture.nativeElement.querySelector('.login-btn');
    expect(loginButton).toBeTruthy();
    expect(loginButton.textContent).toContain('Login');
  });

  it('should hide Login button when authenticated', () => {
    authService.isAuthenticated.and.returnValue(true);
    fixture.detectChanges();

    const loginButton = fixture.nativeElement.querySelector('.login-btn');
    expect(loginButton).toBeFalsy();
  });

  it('should show Logout button when authenticated', () => {
    authService.isAuthenticated.and.returnValue(true);
    fixture.detectChanges();

    const logoutButton = fixture.nativeElement.querySelector('.logout-btn');
    expect(logoutButton).toBeTruthy();
    expect(logoutButton.textContent).toContain('Logout');
  });

  it('should hide Logout button when not authenticated', () => {
    authService.isAuthenticated.and.returnValue(false);
    fixture.detectChanges();

    const logoutButton = fixture.nativeElement.querySelector('.logout-btn');
    expect(logoutButton).toBeFalsy();
  });

  it('should call authService.logout when logout button is clicked', () => {
    authService.isAuthenticated.and.returnValue(true);
    fixture.detectChanges();

    component.logout();

    expect(authService.logout).toHaveBeenCalled();
  });

  it('should navigate to home after logout', () => {
    authService.isAuthenticated.and.returnValue(true);
    spyOn(router, 'navigate');
    
    component.logout();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should call logout method when logout button is clicked', () => {
    authService.isAuthenticated.and.returnValue(true);
    fixture.detectChanges();

    spyOn(component, 'logout');
    const logoutButton = fixture.nativeElement.querySelector('.logout-btn');
    logoutButton.click();

    expect(component.logout).toHaveBeenCalled();
  });
});
