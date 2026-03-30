import { Product } from './product.model';

describe('Product', () => {
  it('should create an instance', () => {
    const product = new Product(1, 'SKU-001', 'Test', 'Description', 9.99, 'img.jpg', true, 5, new Date(), new Date());
    expect(product).toBeTruthy();
  });

  it('should store all constructor properties', () => {
    const created = new Date('2026-01-01');
    const updated = new Date('2026-01-02');
    const product = new Product(42, 'SKU-042', 'Widget', 'A widget', 24.99, 'widget.png', true, 100, created, updated);
    expect(product.id).toBe(42);
    expect(product.sku).toBe('SKU-042');
    expect(product.name).toBe('Widget');
    expect(product.description).toBe('A widget');
    expect(product.unitPrice).toBe(24.99);
    expect(product.imageUrl).toBe('widget.png');
    expect(product.active).toBe(true);
    expect(product.unitsInStock).toBe(100);
    expect(product.dateCreated).toBe(created);
    expect(product.lastUpdated).toBe(updated);
  });
});
