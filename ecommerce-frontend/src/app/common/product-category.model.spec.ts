import { ProductCategory } from './product-category.model';

describe('ProductCategory', () => {
  it('should create an instance', () => {
    const category = new ProductCategory(1, 'Electronics');
    expect(category).toBeTruthy();
  });

  it('should store id and category name', () => {
    const category = new ProductCategory(5, 'Books');
    expect(category.id).toBe(5);
    expect(category.categoryName).toBe('Books');
  });
});
