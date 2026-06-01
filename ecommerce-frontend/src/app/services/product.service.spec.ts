import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get a single product by id', () => {
    const mockProduct = { id: 1, name: 'Widget', unitPrice: 9.99 };
    service.getProduct(1).subscribe((product: any) => {
      expect(product.name).toBe('Widget');
    });
    const req = httpMock.expectOne('/api/products/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockProduct);
  });

  it('should get product list by category', () => {
    const mockResponse = {
      _embedded: { products: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] }
    };
    service.getProductList(1).subscribe((products: any[]) => {
      expect(products.length).toBe(2);
    });
    const req = httpMock.expectOne('/api/products/search/findByCategoryId?id=1');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should search products by keyword', () => {
    const mockResponse = {
      _embedded: { products: [{ id: 3, name: 'Gadget' }] }
    };
    service.searchProducts('Gadget').subscribe((products: any[]) => {
      expect(products.length).toBe(1);
      expect(products[0].name).toBe('Gadget');
    });
    const req = httpMock.expectOne('/api/products/search/findByNameContainingIgnoreCase?name=Gadget');
    req.flush(mockResponse);
  });

  it('should get product list paginated', () => {
    const mockResponse = {
      _embedded: { products: [{ id: 1, name: 'A' }] },
      page: { size: 10, totalElements: 1, totalPages: 1, number: 0 }
    };
    service.getProductListPaginate(1, 10, 5).subscribe((response: any) => {
      expect(response.page.totalElements).toBe(1);
    });
    const req = httpMock.expectOne('/api/products/search/findByCategoryId?id=5&page=0&size=10');
    req.flush(mockResponse);
  });

  it('should get product categories', () => {
    const mockResponse = {
      _embedded: { productCategory: [{ id: 1, categoryName: 'Books' }] }
    };
    service.getProductCategories().subscribe((categories: any[]) => {
      expect(categories.length).toBe(1);
      expect(categories[0].categoryName).toBe('Books');
    });
    const req = httpMock.expectOne('/api/product-category');
    req.flush(mockResponse);
  });

  it('should search products paginated', () => {
    const mockResponse = {
      _embedded: { products: [{ id: 1, name: 'Test' }] },
      page: { size: 5, totalElements: 1, totalPages: 1, number: 0 }
    };
    service.searchProductsPaginate(1, 5, 'Test').subscribe((response: any) => {
      expect(response._embedded.products.length).toBe(1);
    });
    const req = httpMock.expectOne('/api/products/search/findByNameContainingIgnoreCase?name=Test&page=0&size=5');
    req.flush(mockResponse);
  });

  // Regression: Spring Data REST omits `_embedded` entirely when a page has
  // zero results. The previous implementation did `response._embedded.products`,
  // which threw a TypeError and left the products page stuck on its spinner.
  it('should return an empty array when the response has no _embedded block', () => {
    let received: any[] | undefined;
    let errored = false;

    service.searchProducts('zzznomatch').subscribe({
      next: (products) => { received = products; },
      error: () => { errored = true; }
    });

    const req = httpMock.expectOne('/api/products/search/findByNameContainingIgnoreCase?name=zzznomatch');
    req.flush({ page: { size: 20, totalElements: 0, totalPages: 0, number: 0 } });

    expect(errored).toBe(false);
    expect(received).toEqual([]);
  });

  // Regression: keywords with spaces or reserved characters used to be
  // dropped straight into the query string, producing malformed requests.
  it('should URL-encode keywords containing spaces and special characters', () => {
    service.searchProductsPaginate(1, 10, 'red shirt & socks').subscribe();

    const req = httpMock.expectOne(
      '/api/products/search/findByNameContainingIgnoreCase?name=red%20shirt%20%26%20socks&page=0&size=10'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ page: { size: 10, totalElements: 0, totalPages: 0, number: 0 } });
  });

  it('should return empty array immediately for getProductsByIds([])', () => {
    let emitted: any = null;
    service.getProductsByIds([]).subscribe(result => { emitted = result; });
    expect(emitted).toEqual([]);
    httpMock.expectNone(() => true);
  });

  it('should fetch multiple products by id in input order', () => {
    const productA = { id: 1, name: 'Alpha', unitPrice: 1 };
    const productB = { id: 5, name: 'Bravo', unitPrice: 2 };
    let emitted: any[] = [];

    service.getProductsByIds([1, 5]).subscribe(result => { emitted = result; });

    const req1 = httpMock.expectOne('/api/products/1');
    const req5 = httpMock.expectOne('/api/products/5');
    expect(req1.request.method).toBe('GET');
    expect(req5.request.method).toBe('GET');

    // Flush out of input order to prove the method preserves input order.
    req5.flush(productB);
    req1.flush(productA);

    expect(emitted.map(p => p.id)).toEqual([1, 5]);
  });
});
