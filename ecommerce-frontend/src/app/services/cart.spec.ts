import { CartService } from './cart';
import { CartItem } from '../common/cart-item';
import { Product } from '../common/product';
import { firstValueFrom } from 'rxjs';

describe('CartService', () => {
  let service: CartService;
  let mockStorage: { [key: string]: string };

  beforeEach(() => {
    mockStorage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => mockStorage[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => { mockStorage[key] = value; });
    service = new CartService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createCartItem(id: number, name: string, price: number): CartItem {
    const product = new Product(id, `SKU-${id}`, name, 'Desc', price, 'img.jpg', true, 10, new Date(), new Date());
    return new CartItem(product);
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with empty cart', () => {
    expect(service.cartItems.length).toBe(0);
  });

  it('should add item to cart', () => {
    const item = createCartItem(1, 'Widget', 9.99);
    service.addToCart(item);
    expect(service.cartItems.length).toBe(1);
  });

  it('should increment quantity for duplicate item', () => {
    const item = createCartItem(1, 'Widget', 9.99);
    service.addToCart(item);
    service.addToCart(createCartItem(1, 'Widget', 9.99));
    expect(service.cartItems.length).toBe(1);
    expect(service.cartItems[0].quantity).toBe(2);
  });

  it('should compute total price', async () => {
    const item1 = createCartItem(1, 'A', 10.00);
    const item2 = createCartItem(2, 'B', 20.00);
    service.addToCart(item1);
    service.addToCart(item2);
    const price = await firstValueFrom(service.totalPrice);
    expect(price).toBe(30.00);
  });

  it('should compute total quantity', async () => {
    const item = createCartItem(1, 'A', 10.00);
    service.addToCart(item);
    service.addToCart(createCartItem(1, 'A', 10.00));
    const qty = await firstValueFrom(service.totalQuantity);
    expect(qty).toBe(2);
  });

  it('should decrement quantity', () => {
    const item = createCartItem(1, 'Widget', 9.99);
    service.addToCart(item);
    service.addToCart(createCartItem(1, 'Widget', 9.99));
    service.decrementQuantity(service.cartItems[0]);
    expect(service.cartItems[0].quantity).toBe(1);
  });

  it('should remove item when quantity reaches 0', () => {
    const item = createCartItem(1, 'Widget', 9.99);
    service.addToCart(item);
    service.decrementQuantity(service.cartItems[0]);
    expect(service.cartItems.length).toBe(0);
  });

  it('should remove specific item', () => {
    service.addToCart(createCartItem(1, 'A', 10));
    service.addToCart(createCartItem(2, 'B', 20));
    service.remove(service.cartItems[0]);
    expect(service.cartItems.length).toBe(1);
    expect(service.cartItems[0].id).toBe(2);
  });

  it('should persist cart items to storage', () => {
    service.addToCart(createCartItem(1, 'Widget', 9.99));
    expect(mockStorage['cartItems']).toBeDefined();
    const parsed = JSON.parse(mockStorage['cartItems']);
    expect(parsed.length).toBe(1);
  });
});
