import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authService: { whenReady: ReturnType<typeof vi.fn> };
  let router: { createUrlTree: ReturnType<typeof vi.fn> };
  const loginUrlTree = {} as UrlTree;

  function runGuard(): Observable<boolean | UrlTree> {
    return TestBed.runInInjectionContext(
      () => authGuard({} as never, {} as never),
    ) as Observable<boolean | UrlTree>;
  }

  beforeEach(() => {
    authService = { whenReady: vi.fn() };
    router = { createUrlTree: vi.fn().mockReturnValue(loginUrlTree) };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('waits for the auth bootstrap and allows activation when authenticated', () => {
    authService.whenReady.mockReturnValue(of(true));

    let result: boolean | UrlTree | undefined;
    runGuard().subscribe(r => (result = r));

    expect(authService.whenReady).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to /login when the user is not authenticated', () => {
    authService.whenReady.mockReturnValue(of(false));

    let result: boolean | UrlTree | undefined;
    runGuard().subscribe(r => (result = r));

    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(loginUrlTree);
  });
});
