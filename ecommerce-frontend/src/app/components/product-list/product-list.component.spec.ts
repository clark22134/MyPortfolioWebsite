import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { ProductListComponent } from './product-list.component';
import { CartService } from '../../services/cart.service';
import { Product } from '../../common/product.model';
import { CartItem } from '../../common/cart-item.model';

const mockProduct: Product = new Product(
  1, 'BOOK-1000', 'Test Book', 'A test book', 19.99,
  'assets/images/products/book1.png', true, 100, new Date(), new Date()
);

const mockResponse = {
  _embedded: { products: [mockProduct] },
  page: { size: 8, totalElements: 1, totalPages: 1, number: 0 }
};

const emptyResponse = {
  _embedded: { products: [] },
  page: { size: 8, totalElements: 0, totalPages: 0, number: 0 }
};

function makeActivatedRoute(params: Record<string, string>) {
  return {
    paramMap: of(convertToParamMap(params)),
    snapshot: {
      paramMap: {
        has: (k: string) => k in params,
        get: (k: string) => params[k] ?? null
      }
    }
  };
}

describe('ProductListComponent', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: makeActivatedRoute({ id: '1' }) }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('/api/products/search/findByCategoryId')).flush(mockResponse);
  });

  it('should load products by category on init', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1'));
    req.flush(mockResponse);
    expect(component.products().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('should render products in template', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Test Book');
  });

  it('should render empty state when no products', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(emptyResponse);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No products found');
  });

  it('should set default category id when none provided', () => {
    // Covered in nested describe below
    expect(true).toBe(true);
  });

  it('should handle keyword search mode', () => {
    // Covered in nested describe below
    expect(true).toBe(true);
  });

  it('should update page size to all', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);
    component.theTotalElements.set(50);

    component.updatePageSize('all');
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush({
      _embedded: { products: [] },
      page: { size: 50, totalElements: 50, totalPages: 1, number: 0 }
    });

    expect(component.thePageSize()).toBe(50);
    expect(component.thePageNumber()).toBe(1);
  });

  it('should update page size to specific number', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);

    component.updatePageSize('12');
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush({
      _embedded: { products: [] },
      page: { size: 12, totalElements: 1, totalPages: 1, number: 0 }
    });

    expect(component.thePageSize()).toBe(12);
  });

  it('should open and close product modal', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);

    component.openProductModal(mockProduct);
    expect(component.selectedProduct()).toBe(mockProduct);

    component.closeProductModal();
    expect(component.selectedProduct()).toBeNull();
  });

  it('should render product modal when selected', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);

    component.openProductModal(mockProduct);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain(mockProduct.name);
  });

  it('should add to cart at regular price when not authenticated', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);

    const cartService = TestBed.inject(CartService);
    vi.spyOn(cartService, 'addToCart').mockImplementation(() => {});

    component.addToCart(mockProduct);
    expect(cartService.addToCart).toHaveBeenCalledWith(
      expect.objectContaining({ unitPrice: 19.99 })
    );
  });

  it('should return member price as 70% of original', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);
    const memberPrice = component.getMemberPrice(10.00);
    expect(memberPrice).toBe(7.00);
  });

  it('should return 0 cart quantity for product not in cart', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);
    expect(component.getCartQuantity(mockProduct)).toBe(0);
  });

  it('should return cart quantity for product in cart', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);

    const cartService = TestBed.inject(CartService);
    const item = new CartItem(mockProduct);
    item.quantity = 3;
    cartService.cartItems = [item];

    expect(component.getCartQuantity(mockProduct)).toBe(3);
  });

  it('should increment product in cart', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);

    const cartService = TestBed.inject(CartService);
    vi.spyOn(cartService, 'addToCart').mockImplementation(() => {});

    component.incrementInCart(mockProduct);
    expect(cartService.addToCart).toHaveBeenCalled();
  });

  it('should decrement product in cart', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);

    const cartService = TestBed.inject(CartService);
    const item = new CartItem(mockProduct);
    cartService.cartItems = [item];
    vi.spyOn(cartService, 'decrementQuantity').mockImplementation(() => {});

    component.decrementInCart(mockProduct);
    expect(cartService.decrementQuantity).toHaveBeenCalledWith(item);
  });

  it('should not decrement if product not in cart', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);

    const cartService = TestBed.inject(CartService);
    vi.spyOn(cartService, 'decrementQuantity').mockImplementation(() => {});

    component.decrementInCart(mockProduct);
    expect(cartService.decrementQuantity).not.toHaveBeenCalled();
  });

  it('should remove product from cart', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);

    const cartService = TestBed.inject(CartService);
    const item = new CartItem(mockProduct);
    cartService.cartItems = [item];
    vi.spyOn(cartService, 'remove').mockImplementation(() => {});

    component.removeFromCart(mockProduct);
    expect(cartService.remove).toHaveBeenCalledWith(item);
  });

  it('should not remove if product not in cart', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);

    const cartService = TestBed.inject(CartService);
    vi.spyOn(cartService, 'remove').mockImplementation(() => {});

    component.removeFromCart(mockProduct);
    expect(cartService.remove).not.toHaveBeenCalled();
  });

  it('should calculate deal inventory progress from remaining units', () => {
    component.dealRemainingUnits.set(24);
    expect(component.dealUnitsSold()).toBe(component.dealInventoryTarget - 24);
    expect(component.dealProgressPercent()).toBe(80);
  });

  it('should render mid-page promo after fourth product when list is long enough', () => {
    component.products.set([
      mockProduct,
      new Product(2, 'BOOK-1001', 'Item 2', 'Desc', 10, '', true, 10, new Date(), new Date()),
      new Product(3, 'BOOK-1002', 'Item 3', 'Desc', 10, '', true, 10, new Date(), new Date()),
      new Product(4, 'BOOK-1003', 'Item 4', 'Desc', 10, '', true, 10, new Date(), new Date()),
      new Product(5, 'BOOK-1004', 'Item 5', 'Desc', 10, '', true, 10, new Date(), new Date())
    ]);

    expect(component.shouldRenderMidPagePromo(3)).toBe(true);
    expect(component.shouldRenderMidPagePromo(2)).toBe(false);
    expect(component.shouldRenderMidPagePromo(4)).toBe(false);
  });

  it('should left-pad countdown values with zeroes', () => {
    expect(component.formatCountdown(4)).toBe('04');
    expect(component.formatCountdown(14)).toBe('14');
  });

  it('should reset page when category changes', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);

    component.currentCategoryId.set(99);
    component.listProducts();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);
    expect(component.thePageNumber()).toBe(1);
  });
});

describe('ProductListComponent - default category route', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: makeActivatedRoute({}) }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    httpMock.verify();
  });

  it('should set default category id to 1 when no id param', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);
    expect(component.currentCategoryId()).toBe(1);
  });
});

describe('ProductListComponent - keyword search route', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: makeActivatedRoute({ keyword: 'book' }) }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    httpMock.verify();
  });

  it('should enter keyword search mode when keyword param present', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByNameContainingIgnoreCase')).flush(mockResponse);
    expect(component.searchMode()).toBe(true);
    expect(component.products().length).toBe(1);
  });
});
