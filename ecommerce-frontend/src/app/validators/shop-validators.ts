import { AbstractControl, ValidationErrors } from '@angular/forms';

export class ShopValidators {

  static notOnlyWhitespace(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (typeof value === 'string' && value.trim().length === 0) {
      return { notOnlyWhitespace: true };
    }
    return null;
  }
}
