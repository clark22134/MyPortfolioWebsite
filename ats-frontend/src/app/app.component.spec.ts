import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates the app and bootstraps auth', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/auth/me');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders a router-outlet and toast container', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    const outlet = fixture.nativeElement.querySelector('router-outlet');
    const toast = fixture.nativeElement.querySelector('app-toast-container');
    expect(outlet).toBeTruthy();
    expect(toast).toBeTruthy();
  });
});
