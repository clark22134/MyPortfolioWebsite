import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { SearchComponent } from './search.component';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Regression: keywords with spaces or reserved characters used to be
  // interpolated raw, producing a broken URL like `/search/red shirt`.
  it('should URL-encode keywords with spaces and special characters', () => {
    const navSpy = vi.spyOn(router, 'navigateByUrl');

    component.doSearch('red shirt & socks');

    expect(navSpy).toHaveBeenCalledWith('/search/red%20shirt%20%26%20socks');
  });

  // Regression: submitting an empty search box used to navigate to `/search/`
  // and fall through the wildcard route.
  it('should redirect to /products when the keyword is empty or whitespace', () => {
    const navSpy = vi.spyOn(router, 'navigateByUrl');

    component.doSearch('   ');

    expect(navSpy).toHaveBeenCalledWith('/products');
  });
});

