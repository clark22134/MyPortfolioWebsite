import { AbstractControl, ValidationErrors } from '@angular/forms';

export class ShopValidators {

  static notOnlyWhitespace(control: AbstractControl): ValidationErrors | null {
    if (control.value != null && typeof control.value === 'string' && control.value.trim().length === 0) {
      return { notOnlyWhitespace: true };
    }
    return null;
  }
}
