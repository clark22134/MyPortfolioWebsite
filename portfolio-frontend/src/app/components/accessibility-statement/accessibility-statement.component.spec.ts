import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { createSpyObj } from '../../../test-helpers';
import { AccessibilityStatementComponent } from './accessibility-statement.component';
import { AuthService, UserInfo } from '../../services/auth.service';

const SAMPLE_USER: UserInfo = {
  username: 'clark',
  email: 'clark@example.com',
  fullName: 'Clark Foster',
};

describe('AccessibilityStatementComponent', () => {
  let component: AccessibilityStatementComponent;
  let fixture: ComponentFixture<AccessibilityStatementComponent>;
  let currentUser$: BehaviorSubject<UserInfo | null>;

  beforeEach(async () => {
    currentUser$ = new BehaviorSubject<UserInfo | null>(null);
    const authServiceSpy = createSpyObj('AuthService', [], {
      currentUser$: currentUser$.asObservable(),
    });

    await TestBed.configureTestingModule({
      imports: [AccessibilityStatementComponent, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessibilityStatementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts unauthenticated when no user is emitted', () => {
    expect(component.isAuthenticated).toBe(false);
  });

  it('tracks the authenticated state from AuthService.currentUser$', () => {
    currentUser$.next(SAMPLE_USER);
    expect(component.isAuthenticated).toBe(true);

    currentUser$.next(null);
    expect(component.isAuthenticated).toBe(false);
  });
});
