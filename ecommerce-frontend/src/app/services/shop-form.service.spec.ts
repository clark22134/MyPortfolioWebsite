import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ShopFormService } from './shop-form.service';
import { firstValueFrom } from 'rxjs';

describe('ShopFormService', () => {
  let service: ShopFormService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ShopFormService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get countries', () => {
    service.getCountries().subscribe((countries: any[]) => {
      expect(countries.length).toBe(2);
      expect(countries[0].name).toBe('United States');
    });

    const req = httpMock.expectOne('/api/countries');
    expect(req.request.method).toBe('GET');
    req.flush({
      _embedded: {
        countries: [
          { id: 1, code: 'US', name: 'United States' },
          { id: 2, code: 'CA', name: 'Canada' }
        ]
      }
    });
  });

  it('should get states by country code', () => {
    service.getStates('US').subscribe((states: any[]) => {
      expect(states.length).toBe(2);
      expect(states[0].name).toBe('California');
    });

    const req = httpMock.expectOne('/api/states/search/findByCountryCode?code=US');
    expect(req.request.method).toBe('GET');
    req.flush({
      _embedded: {
        states: [
          { id: 1, name: 'California' },
          { id: 2, name: 'New York' }
        ]
      }
    });
  });

  it('should get credit card years starting from current year', async () => {
    const currentYear = new Date().getFullYear();
    const years: number[] = await firstValueFrom(service.getCreditCardYears());
    expect(years.length).toBe(10);
    expect(years[0]).toBe(currentYear);
    expect(years[9]).toBe(currentYear + 9);
  });

  it('should get credit card months from start month', async () => {
    const months: number[] = await firstValueFrom(service.getCreditCardMonths(6));
    expect(months.length).toBe(7); // months 6 through 12
    expect(months[0]).toBe(6);
    expect(months[months.length - 1]).toBe(12);
  });

  it('should get all 12 months when starting from 1', async () => {
    const months: number[] = await firstValueFrom(service.getCreditCardMonths(1));
    expect(months.length).toBe(12);
    expect(months[0]).toBe(1);
    expect(months[11]).toBe(12);
  });
});
