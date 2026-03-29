import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render sidebar navigation', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('nav.sidebar');
    expect(nav).toBeTruthy();
  });

  it('should have brand text HireFlow by Clark', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const brandText = fixture.nativeElement.querySelector('.brand-text');
    expect(brandText?.textContent?.trim()).toContain('HireFlow');
    const subtitle = fixture.nativeElement.querySelector('.brand-subtitle');
    expect(subtitle?.textContent?.trim()).toBe('by Clark');
  });

  it('should render router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const outlet = fixture.nativeElement.querySelector('router-outlet');
    expect(outlet).toBeTruthy();
  });

  it('should have navigation links', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('.nav-links a');
    expect(links.length).toBe(3);
  });
});
