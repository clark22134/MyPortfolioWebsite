import { OrderItem } from './order-item';
import { CartItem } from './cart-item';
import { Product } from './product';

describe('OrderItem', () => {
  it('should create an instance from a CartItem', () => {
    const product = new Product(10, 'SKU', 'Item', 'Desc', 15.00, 'img.jpg', true, 5, new Date(), new Date());
    const cartItem = new CartItem(product);
    cartItem.quantity = 3;
    const orderItem = new OrderItem(cartItem);
    expect(orderItem).toBeTruthy();
  });

  it('should copy cart item properties', () => {
    const product = new Product(10, 'SKU', 'Item', 'Desc', 15.00, 'img.jpg', true, 5, new Date(), new Date());
    const cartItem = new CartItem(product);
    cartItem.quantity = 3;
    const orderItem = new OrderItem(cartItem);
    expect(orderItem.productId).toBe(10);
    expect(orderItem.unitPrice).toBe(15.00);
    expect(orderItem.quantity).toBe(3);
    expect(orderItem.imageUrl).toBe('img.jpg');
  });
});
