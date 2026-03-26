import { FormControl } from '@angular/forms';
import { ShopValidators } from './shop-validators';

describe('ShopValidators', () => {

  describe('notOnlyWhitespace', () => {
    it('should return null for valid non-whitespace input', () => {
      const control = new FormControl('hello');
      const result = ShopValidators.notOnlyWhitespace(control);
      expect(result).toBeNull();
    });

    it('should return error for only whitespace', () => {
      const control = new FormControl('   ');
      const result = ShopValidators.notOnlyWhitespace(control);
      expect(result).toEqual({ notOnlyWhitespace: true });
    });

    it('should return null for null value', () => {
      const control = new FormControl(null);
      const result = ShopValidators.notOnlyWhitespace(control);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      // Empty string has trim().length === 0, so it should be flagged
      const control = new FormControl('');
      const result = ShopValidators.notOnlyWhitespace(control);
      expect(result).toEqual({ notOnlyWhitespace: true });
    });

    it('should return null for string with valid content and whitespace', () => {
      const control = new FormControl('  hello  ');
      const result = ShopValidators.notOnlyWhitespace(control);
      expect(result).toBeNull();
    });

    it('should return null for non-string values', () => {
      const control = new FormControl(42);
      const result = ShopValidators.notOnlyWhitespace(control);
      expect(result).toBeNull();
    });
  });
});
