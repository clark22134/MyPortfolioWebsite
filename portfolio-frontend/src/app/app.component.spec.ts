import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TerminalLoaderService } from './services/terminal-loader.service';
import { vi } from 'vitest';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        TerminalLoaderService
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have the Portfolio title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Portfolio');
  });

  it('should render router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should render a single global nav outside routed templates', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const navs = compiled.querySelectorAll('app-nav');
    expect(navs.length).toBe(1);
    expect(compiled.querySelector('main > app-nav')).toBeNull();
  });

  it('should classify only root paths as home route', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;

    expect(app.computeIsHomeRoute('/')).toBe(true);
    expect(app.computeIsHomeRoute('/?tab=1#anchor')).toBe(true);
    expect(app.computeIsHomeRoute('/projects')).toBe(false);
  });

  it('should unsubscribe subscriptions on destroy', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;
    const unsubscribeSpy = vi.spyOn(app.subscriptions, 'unsubscribe');

    app.ngOnDestroy();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
