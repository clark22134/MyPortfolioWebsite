import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CartService } from './cart.service';
import { CartItem } from '../common/cart-item.model';
import { Product } from '../common/product.model';
import { firstValueFrom } from 'rxjs';

describe('CartService', () => {
  let service: CartService;
  let httpMock: HttpTestingController;
  let mockStorage: { [key: string]: string };

  function setupService(storageOverrides: { [key: string]: string } = {}) {
    mockStorage = { ...storageOverrides };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => mockStorage[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => { mockStorage[key] = value; });

    TestBed.configureTestingModule({
      providers: [CartService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CartService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    httpMock?.verify();
    vi.restoreAllMocks();
  });

  function createCartItem(id: number, name: string, price: number): CartItem {
    const product = new Product(id, `SKU-${id}`, name, 'Desc', price, 'img.jpg', true, 10, new Date(), new Date());
    return new CartItem(product);
  }

  it('should be created', () => {
    setupService();
    expect(service).toBeTruthy();
  });

  it('should start with empty cart', () => {
    setupService();
    expect(service.cartItems.length).toBe(0);
  });

  it('should add item to cart', () => {
    setupService();
    const item = createCartItem(1, 'Widget', 9.99);
    service.addToCart(item);
    expect(service.cartItems.length).toBe(1);
  });

  it('should increment quantity for duplicate item', () => {
    setupService();
    const item = createCartItem(1, 'Widget', 9.99);
    service.addToCart(item);
    service.addToCart(createCartItem(1, 'Widget', 9.99));
    expect(service.cartItems.length).toBe(1);
    expect(service.cartItems[0].quantity).toBe(2);
  });

  it('should compute total price', async () => {
    setupService();
    const item1 = createCartItem(1, 'A', 10.00);
    const item2 = createCartItem(2, 'B', 20.00);
    service.addToCart(item1);
    service.addToCart(item2);
    const price = await firstValueFrom(service.totalPrice);
    expect(price).toBe(30.00);
  });

  it('should compute total quantity', async () => {
    setupService();
    const item = createCartItem(1, 'A', 10.00);
    service.addToCart(item);
    service.addToCart(createCartItem(1, 'A', 10.00));
    const qty = await firstValueFrom(service.totalQuantity);
    expect(qty).toBe(2);
  });

  it('should decrement quantity', () => {
    setupService();
    const item = createCartItem(1, 'Widget', 9.99);
    service.addToCart(item);
    service.addToCart(createCartItem(1, 'Widget', 9.99));
    service.decrementQuantity(service.cartItems[0]);
    expect(service.cartItems[0].quantity).toBe(1);
  });

  it('should remove item when quantity reaches 0', () => {
    setupService();
    const item = createCartItem(1, 'Widget', 9.99);
    service.addToCart(item);
    service.decrementQuantity(service.cartItems[0]);
    expect(service.cartItems.length).toBe(0);
  });

  it('should remove specific item', () => {
    setupService();
    service.addToCart(createCartItem(1, 'A', 10));
    service.addToCart(createCartItem(2, 'B', 20));
    service.remove(service.cartItems[0]);
    expect(service.cartItems.length).toBe(1);
    expect(service.cartItems[0].id).toBe(2);
  });

  it('should persist cart items to storage under guest key', () => {
    setupService();
    service.addToCart(createCartItem(1, 'Widget', 9.99));
    expect(mockStorage['cartItems_guest']).toBeDefined();
    const parsed = JSON.parse(mockStorage['cartItems_guest']);
    expect(parsed.length).toBe(1);
  });

  it('should load cart from user-scoped key when authUser is in storage', () => {
    const userCart = JSON.stringify([{ id: 5, name: 'Saved', sku: 'S', unitPrice: 15, imageUrl: '', quantity: 2 }]);
    setupService({
      'authUser': JSON.stringify({ email: 'user@test.com' }),
      'cartItems_user@test.com': userCart
    });
    expect(service.cartItems.length).toBe(1);
    expect(service.cartItems[0].id).toBe(5);
  });

  it('should fetch server cart on login and merge guest items', () => {
    setupService();
    service.addToCart(createCartItem(1, 'GuestItem', 5));
    expect(service.cartItems.length).toBe(1);

    service.onLogin('alice@test.com');

    // Respond to the GET /api/cart request with server items
    const req = httpMock.expectOne('/api/cart');
    expect(req.request.method).toBe('GET');
    req.flush([{ productId: 10, name: 'ServerItem', unitPrice: 20, quantity: 1, imageUrl: '' }]);

    // Should have merged: server item + guest item
    expect(service.cartItems.length).toBe(2);
    expect(service.cartItems.map(i => i.id).sort()).toEqual([1, 10]);

    // Should sync merged cart to server
    const putReq = httpMock.expectOne('/api/cart');
    expect(putReq.request.method).toBe('PUT');
    putReq.flush([]);

    // Guest cart should still be persisted
    expect(mockStorage['cartItems_guest']).toBeDefined();
  });

  it('should save cart to server on logout', () => {
    setupService({
      'authUser': JSON.stringify({ email: 'bob@test.com' })
    });
    service.addToCart(createCartItem(3, 'UserOnly', 12));

    // syncToServer is called on addToCart since logged in
    const addPut = httpMock.expectOne('/api/cart');
    addPut.flush([]);

    service.onLogout();

    // Should sync to server on logout
    const logoutPut = httpMock.expectOne('/api/cart');
    expect(logoutPut.request.method).toBe('PUT');
    logoutPut.flush([]);

    // After logout, should switch to guest cart (empty)
    expect(service.cartItems.length).toBe(0);

    // User's cart should still be persisted in localStorage
    expect(mockStorage['cartItems_bob@test.com']).toBeDefined();
    const saved = JSON.parse(mockStorage['cartItems_bob@test.com']);
    expect(saved.length).toBe(1);
    expect(saved[0].id).toBe(3);
  });

  it('should fall back to localStorage on server error during login', () => {
    setupService();
    service.addToCart(createCartItem(1, 'GuestItem', 5));

    const userCart = JSON.stringify([{ id: 10, name: 'LocalItem', sku: 'A', unitPrice: 20, imageUrl: '', quantity: 1 }]);
    mockStorage['cartItems_alice@test.com'] = userCart;

    service.onLogin('alice@test.com');

    // Simulate server error
    const req = httpMock.expectOne('/api/cart');
    req.error(new ProgressEvent('error'));

    // Should fall back to localStorage and merge with guest items
    expect(service.cartItems.length).toBe(2);
    expect(service.cartItems.map(i => i.id).sort()).toEqual([1, 10]);
  });
});
