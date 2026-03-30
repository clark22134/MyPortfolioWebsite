import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map } from 'rxjs';
import { Country } from '../common/country.model';
import { State } from '../common/state.model';

@Injectable({
  providedIn: 'root',
})
export class ShopFormService {

  private countriesUrl = '/api/countries';
  private statesUrl = '/api/states';

  constructor(private httpClient: HttpClient) {}

  getCountries(): Observable<Country[]> {
    return this.httpClient.get<GetResponseCountries>(this.countriesUrl).pipe(
      map(response => response._embedded.countries)
    );
  }

  getStates(countryCode: string): Observable<State[]> {
    const searchUrl = `${this.statesUrl}/search/findByCountryCode?code=${countryCode}`;
    return this.httpClient.get<GetResponseStates>(searchUrl).pipe(
      map(response => response._embedded.states)
    );
  }

  getCreditCardYears(): Observable<number[]> {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear + i);
    return of(years);
  }

  getCreditCardMonths(startMonth: number = 1): Observable<number[]> {
    const months = Array.from({ length: 13 - startMonth }, (_, i) => startMonth + i);
    return of(months);
  }
}

interface GetResponseCountries {
  _embedded: {
    countries: Country[];
  };
}

interface GetResponseStates {
  _embedded: {
    states: State[];
  };
}
