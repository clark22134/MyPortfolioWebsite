import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ProductCategoryMenu } from './product-category-menu.component';

const mockCategories = [
  { id: 1, categoryName: 'Books' },
  { id: 2, categoryName: 'Coffee Mugs' }
];

describe('ProductCategoryMenu', () => {
  let component: ProductCategoryMenu;
  let fixture: ComponentFixture<ProductCategoryMenu>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [ProductCategoryMenu],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProductCategoryMenu);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    fixture.detectChanges();
    httpMock.expectOne('/api/product-category').flush({ _embedded: { productCategory: mockCategories } });
  });

  it('should load product categories on init', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/product-category').flush({ _embedded: { productCategory: mockCategories } });
    expect(component.productCategories().length).toBe(2);
  });

  it('should render categories in template', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/product-category').flush({ _embedded: { productCategory: mockCategories } });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Books');
  });

  it('should start with categories expanded', () => {
    expect(component.categoriesExpanded()).toBe(true);
    fixture.detectChanges();
    httpMock.expectOne('/api/product-category').flush({ _embedded: { productCategory: mockCategories } });
  });

  it('should toggle categories expanded state', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/product-category').flush({ _embedded: { productCategory: mockCategories } });
    component.toggleCategories();
    expect(component.categoriesExpanded()).toBe(false);
    component.toggleCategories();
    expect(component.categoriesExpanded()).toBe(true);
  });

  it('should handle error from product categories endpoint gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fixture.detectChanges();
    httpMock.expectOne('/api/product-category').flush('Error', { status: 500, statusText: 'Server Error' });
    expect(component.productCategories().length).toBe(0);
    consoleSpy.mockRestore();
  });
});
