import { CartItem } from './cart-item';
import { Product } from './product';

describe('CartItem', () => {
  const product = new Product(1, 'SKU-001', 'Test Product', 'A test product', 19.99, 'img.jpg', true, 10, new Date(), new Date());

  it('should create an instance from a product', () => {
    const item = new CartItem(product);
    expect(item).toBeTruthy();
  });

  it('should copy product id', () => {
    const item = new CartItem(product);
    expect(item.id).toBe(1);
  });

  it('should copy product name', () => {
    const item = new CartItem(product);
    expect(item.name).toBe('Test Product');
  });

  it('should copy product unit price', () => {
    const item = new CartItem(product);
    expect(item.unitPrice).toBe(19.99);
  });

  it('should set original price from unit price', () => {
    const item = new CartItem(product);
    expect(item.originalPrice).toBe(19.99);
  });

  it('should default quantity to 1', () => {
    const item = new CartItem(product);
    expect(item.quantity).toBe(1);
  });

  it('should copy product image url', () => {
    const item = new CartItem(product);
    expect(item.imageUrl).toBe('img.jpg');
  });
});
