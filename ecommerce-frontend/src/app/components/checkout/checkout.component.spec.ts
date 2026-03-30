import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CheckoutComponent } from './checkout.component';
import { CustomerProfile } from '../../services/auth.service';

const mockProfile: CustomerProfile = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  defaultShippingAddress: {
    street: '123 Main St',
    city: 'Springfield',
    state: 'Illinois',
    zipCode: '62701',
    country: 'United States',
  },
  defaultBillingAddress: {
    street: '456 Oak Ave',
    city: 'Springfield',
    state: 'Illinois',
    zipCode: '62701',
    country: 'United States',
  },
  cardType: 'Visa',
  nameOnCard: 'John Doe',
  cardNumberLast4: '1234',
  cardExpirationMonth: 12,
  cardExpirationYear: 2027,
};

describe('CheckoutComponent', () => {
  let component: CheckoutComponent;
  let fixture: ComponentFixture<CheckoutComponent>;

  beforeEach(async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('CheckoutComponent - useSaved* toggles', () => {
  let component: CheckoutComponent;
  let fixture: ComponentFixture<CheckoutComponent>;
  let httpTesting: HttpTestingController;

  function flushInitRequests(profile: CustomerProfile | null = mockProfile) {
    // Flush countries request from ngOnInit
    const countriesReq = httpTesting.match('/api/countries');
    countriesReq.forEach(req => req.flush({ _embedded: { countries: [{ code: 'US', name: 'United States' }] } }));

    // Flush profile request (only made when logged in)
    if (profile) {
      const profileReqs = httpTesting.match('/api/auth/profile');
      profileReqs.forEach(req => req.flush(profile));
    }

    fixture.detectChanges();
  }

  beforeEach(async () => {
    // Simulate logged-in user in localStorage; return null for other keys (e.g. cartItems)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'authUser') return JSON.stringify({ email: 'john@example.com' });
      return null;
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit
  });

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
  });

  it('should render useSavedShipping toggle when logged in with saved shipping address', () => {
    flushInitRequests();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Use saved shipping address');
  });

  it('should render useSavedBilling toggle when logged in with saved billing address', () => {
    flushInitRequests();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Use saved billing address');
  });

  it('should render useSavedCard toggle when logged in with saved card', () => {
    flushInitRequests();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Use saved card on file');
  });

  it('should not render saved toggles when profile has no saved addresses', () => {
    const profileWithoutSaved: CustomerProfile = {
      ...mockProfile,
      defaultShippingAddress: null,
      defaultBillingAddress: null,
      cardType: null,
      nameOnCard: null,
      cardNumberLast4: null,
      cardExpirationMonth: null,
      cardExpirationYear: null,
    };
    flushInitRequests(profileWithoutSaved);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).not.toContain('Use saved shipping address');
    expect(el.textContent).not.toContain('Use saved billing address');
    expect(el.textContent).not.toContain('Use saved card on file');
  });

  it('should show saved shipping summary when toggle is checked', () => {
    flushInitRequests();

    const toggles = fixture.nativeElement.querySelectorAll('.saved-toggle input[type="checkbox"]');
    const shippingToggle = toggles[0] as HTMLInputElement;
    shippingToggle.click();

    // fillAddressGroup triggers a states lookup
    const statesReq = httpTesting.expectOne(req => req.url.includes('/api/states/search/findByCountryCode'));
    statesReq.flush({ _embedded: { states: [{ id: 1, name: 'Illinois' }] } });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('123 Main St');
    expect(el.textContent).toContain('Springfield');
  });

  it('should show saved billing summary when toggle is checked', () => {
    flushInitRequests();

    const toggles = fixture.nativeElement.querySelectorAll('.saved-toggle input[type="checkbox"]');
    const billingToggle = toggles[1] as HTMLInputElement;
    billingToggle.click();

    const statesReq = httpTesting.expectOne(req => req.url.includes('/api/states/search/findByCountryCode'));
    statesReq.flush({ _embedded: { states: [{ id: 1, name: 'Illinois' }] } });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('456 Oak Ave');
  });

  it('should show saved card details when toggle is checked', () => {
    flushInitRequests();

    const toggles = fixture.nativeElement.querySelectorAll('.saved-toggle input[type="checkbox"]');
    const cardToggle = toggles[2] as HTMLInputElement;
    cardToggle.click();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Visa');
    expect(el.textContent).toContain('1234');
  });

  it('should hide shipping form fields when useSavedShipping is toggled on', () => {
    flushInitRequests();

    // Before toggle: shipping form should be visible
    expect(fixture.nativeElement.querySelector('#shippingStreet')).toBeTruthy();

    // Toggle saved shipping on
    const shippingToggle = fixture.nativeElement.querySelector('.saved-toggle input[type="checkbox"]') as HTMLInputElement;
    shippingToggle.click();

    const statesReq = httpTesting.expectOne(req => req.url.includes('/api/states/search/findByCountryCode'));
    statesReq.flush({ _embedded: { states: [{ id: 1, name: 'Illinois' }] } });
    fixture.detectChanges();

    // After toggle: shipping form should be hidden
    expect(fixture.nativeElement.querySelector('#shippingStreet')).toBeFalsy();
  });

  it('should re-show shipping form fields when useSavedShipping is toggled off', () => {
    flushInitRequests();

    const shippingToggle = fixture.nativeElement.querySelector('.saved-toggle input[type="checkbox"]') as HTMLInputElement;

    // Toggle on
    shippingToggle.click();
    const statesReq = httpTesting.expectOne(req => req.url.includes('/api/states/search/findByCountryCode'));
    statesReq.flush({ _embedded: { states: [{ id: 1, name: 'Illinois' }] } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#shippingStreet')).toBeFalsy();

    // Toggle off
    shippingToggle.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#shippingStreet')).toBeTruthy();
  });
});
