import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
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
    httpMock.expectOne(req => req.url.includes('/api/products/search/findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);
  });

  it('should load products by category on init', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=8'));
    req.flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);
    expect(component.products().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('should render products in template', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Test Book');
  });

  it('should render empty state when no products', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(emptyResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);
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
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);
    component.theTotalElements.set(50);

    component.updatePageSize('all');
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=50')).flush({
      _embedded: { products: [] },
      page: { size: 50, totalElements: 50, totalPages: 1, number: 0 }
    });

    expect(component.thePageSize()).toBe(50);
    expect(component.thePageNumber()).toBe(1);
  });

  it('should update page size to specific number', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);

    component.updatePageSize('12');
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=12')).flush({
      _embedded: { products: [] },
      page: { size: 12, totalElements: 1, totalPages: 1, number: 0 }
    });

    expect(component.thePageSize()).toBe(12);
  });

  it('should open and close product modal', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);

    component.openProductModal(mockProduct);
    expect(component.selectedProduct()).toBe(mockProduct);

    component.closeProductModal();
    expect(component.selectedProduct()).toBeNull();
  });

  it('should render product modal when selected', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);

    component.openProductModal(mockProduct);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain(mockProduct.name);
  });

  it('should add to cart at regular price when not authenticated', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);

    const cartService = TestBed.inject(CartService);
    vi.spyOn(cartService, 'addToCart').mockImplementation(() => {});

    component.addToCart(mockProduct);
    expect(cartService.addToCart).toHaveBeenCalledWith(
      expect.objectContaining({ unitPrice: 19.99 })
    );
  });

  it('should return member price as 70% of original', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);
    const memberPrice = component.getMemberPrice(10.00);
    expect(memberPrice).toBe(7.00);
  });

  it('should return 0 cart quantity for product not in cart', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);
    expect(component.getCartQuantity(mockProduct)).toBe(0);
  });

  it('should return cart quantity for product in cart', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);

    const cartService = TestBed.inject(CartService);
    const item = new CartItem(mockProduct);
    item.quantity = 3;
    cartService.cartItems = [item];

    expect(component.getCartQuantity(mockProduct)).toBe(3);
  });

  it('should increment product in cart', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);

    const cartService = TestBed.inject(CartService);
    vi.spyOn(cartService, 'addToCart').mockImplementation(() => {});

    component.incrementInCart(mockProduct);
    expect(cartService.addToCart).toHaveBeenCalled();
  });

  it('should decrement product in cart', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);

    const cartService = TestBed.inject(CartService);
    const item = new CartItem(mockProduct);
    cartService.cartItems = [item];
    vi.spyOn(cartService, 'decrementQuantity').mockImplementation(() => {});

    component.decrementInCart(mockProduct);
    expect(cartService.decrementQuantity).toHaveBeenCalledWith(item);
  });

  it('should not decrement if product not in cart', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);

    const cartService = TestBed.inject(CartService);
    vi.spyOn(cartService, 'decrementQuantity').mockImplementation(() => {});

    component.decrementInCart(mockProduct);
    expect(cartService.decrementQuantity).not.toHaveBeenCalled();
  });

  it('should remove product from cart', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);

    const cartService = TestBed.inject(CartService);
    const item = new CartItem(mockProduct);
    cartService.cartItems = [item];
    vi.spyOn(cartService, 'remove').mockImplementation(() => {});

    component.removeFromCart(mockProduct);
    expect(cartService.remove).toHaveBeenCalledWith(item);
  });

  it('should not remove if product not in cart', () => {
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);

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
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);

    component.currentCategoryId.set(99);
    component.listProducts();
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    expect(component.thePageNumber()).toBe(1);
  });

  describe('promo modal', () => {
    beforeEach(() => {
      fixture.detectChanges();
      httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
      httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);
    });

    it('opens the promo modal, fetches curated products, then clears loading', () => {
      const promo = component.promoHighlights[0]; // ai-toolkit, ids [1,3,10,16]

      component.openPromoModal(promo);

      expect(component.selectedPromo()).toBe(promo);
      expect(component.promoLoading()).toBe(true);
      expect(component.promoProducts()).toEqual([]);

      const reqs = promo.productIds.map(id => httpMock.expectOne(`/api/products/${id}`));
      reqs.forEach((req, idx) => {
        req.flush({ ...mockProduct, id: promo.productIds[idx], name: `P${promo.productIds[idx]}` });
      });

      expect(component.promoLoading()).toBe(false);
      expect(component.promoProducts().map(p => p.id)).toEqual(promo.productIds);
    });

    it('closes the promo modal and clears state', () => {
      const promo = component.promoHighlights[0];
      component.openPromoModal(promo);
      promo.productIds.forEach(id => {
        httpMock.expectOne(`/api/products/${id}`).flush({ ...mockProduct, id });
      });

      component.closePromoModal();

      expect(component.selectedPromo()).toBeNull();
      expect(component.promoProducts()).toEqual([]);
      expect(document.body.style.overflow).toBe('');
    });

    it('navigates to the promo category and closes the modal', () => {
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      const promo = component.promoHighlights[1]; // dev-survival, categoryId 2
      component.openPromoModal(promo);
      promo.productIds.forEach(id => {
        httpMock.expectOne(`/api/products/${id}`).flush({ ...mockProduct, id });
      });

      component.viewPromoCategory();

      expect(navSpy).toHaveBeenCalledWith('/category/2');
      expect(component.selectedPromo()).toBeNull();
    });
  });

  describe('Deal of the Day rotation', () => {
    function makeProduct(id: number, name: string): Product {
      return new Product(id, `SKU-${id}`, name, 'desc', 10, 'img.png', true, 5, new Date(), new Date());
    }

    it('returns null while the deal pool is empty', () => {
      expect(component.dealProduct()).toBeNull();
    });

    it('picks the same product across reads on the same day, different on the next day', () => {
      const pool = [makeProduct(1, 'A'), makeProduct(2, 'B'), makeProduct(3, 'C'), makeProduct(4, 'D')];
      (component as any).dealPool.set(pool);

      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 1, 9, 0, 0));   // June 1
      const dayOne = component.dealProduct();
      const dayOneAgain = component.dealProduct();
      expect(dayOne).toBe(dayOneAgain);

      vi.setSystemTime(new Date(2026, 5, 2, 9, 0, 0));   // June 2
      const dayTwo = component.dealProduct();
      expect(dayTwo).not.toBe(dayOne);

      vi.useRealTimers();
    });

    it('loads the deal pool from category 1 on init', () => {
      fixture.detectChanges();

      httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('page=0&size=8'))
        .flush(mockResponse);

      const dealReq = httpMock.expectOne(req =>
        req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24'));
      const poolResponse = {
        _embedded: { products: [makeProduct(11, 'X'), makeProduct(12, 'Y')] },
        page: { size: 24, totalElements: 2, totalPages: 1, number: 0 }
      };
      dealReq.flush(poolResponse);

      expect(component.dealProduct()).not.toBeNull();
    });
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
    httpMock.expectOne(req => req.url.includes('findByCategoryId') && req.url.includes('size=8')).flush(mockResponse);
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);
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
    httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24')).flush(emptyResponse);
    expect(component.searchMode()).toBe(true);
    expect(component.products().length).toBe(1);
  });
});
