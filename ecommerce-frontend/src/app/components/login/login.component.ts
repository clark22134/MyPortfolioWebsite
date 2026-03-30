import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, RegisterData } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { ShopFormService } from '../../services/shop-form.service';
import { ShopValidators } from '../../validators/shop-validators';
import { Country } from '../../common/country.model';
import { State } from '../../common/state.model';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private shopFormService = inject(ShopFormService);
  private router = inject(Router);

  isRegisterMode = signal(false);
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);
  includeBilling = signal(false);
  billingSameAsShipping = signal(false);
  includeCard = signal(false);

  countries: Country[] = [];
  shippingStates: State[] = [];
  billingStates: State[] = [];
  creditCardYears: number[] = [];
  creditCardMonths: number[] = [];

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  registerForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    shippingAddress: this.fb.group({
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      country: ['', Validators.required],
    }),
    billingAddress: this.fb.group({
      street: [''],
      city: [''],
      state: [''],
      zipCode: [''],
      country: [''],
    }),
    creditCard: this.fb.group({
      cardType: [''],
      nameOnCard: [''],
      cardNumber: [''],
      expirationMonth: [''],
      expirationYear: [''],
      securityCode: [''],
    }),
  });

  constructor() {
    this.shopFormService.getCountries().subscribe(data => this.countries = data);
    this.shopFormService.getCreditCardYears().subscribe(data => this.creditCardYears = data);
    const startMonth = new Date().getMonth() + 1;
    this.shopFormService.getCreditCardMonths(startMonth).subscribe(data => this.creditCardMonths = data);
  }

  toggleMode() {
    this.isRegisterMode.update(v => !v);
    this.errorMessage.set(null);
  }

  toggleBilling() {
    this.includeBilling.update(v => !v);
    if (!this.includeBilling()) {
      this.billingSameAsShipping.set(false);
    }
  }

  toggleCard() {
    this.includeCard.update(v => !v);
    const cardGroup = this.registerForm.get('creditCard');
    if (this.includeCard()) {
      cardGroup?.get('cardType')?.setValidators([Validators.required]);
      cardGroup?.get('nameOnCard')?.setValidators([Validators.required, ShopValidators.notOnlyWhitespace]);
      cardGroup?.get('cardNumber')?.setValidators([Validators.required, Validators.pattern('[0-9]{16}')]);
      cardGroup?.get('expirationMonth')?.setValidators([Validators.required]);
      cardGroup?.get('expirationYear')?.setValidators([Validators.required]);
      cardGroup?.get('securityCode')?.setValidators([Validators.required, Validators.pattern('[0-9]{3}')]);
    } else {
      cardGroup?.get('cardType')?.clearValidators();
      cardGroup?.get('nameOnCard')?.clearValidators();
      cardGroup?.get('cardNumber')?.clearValidators();
      cardGroup?.get('expirationMonth')?.clearValidators();
      cardGroup?.get('expirationYear')?.clearValidators();
      cardGroup?.get('securityCode')?.clearValidators();
    }
    // Update validity after changing validators
    Object.keys((cardGroup as FormGroup).controls).forEach(key => {
      cardGroup?.get(key)?.updateValueAndValidity();
    });
  }

  onShippingCountryChange() {
    const country = this.registerForm.get('shippingAddress.country')?.value;
    if (country) {
      this.shopFormService.getStates(country).subscribe(data => {
        this.shippingStates = data;
        this.registerForm.get('shippingAddress.state')?.setValue('');
      });
    }
  }

  toggleBillingSameAsShipping() {
    this.billingSameAsShipping.update(v => !v);
    if (this.billingSameAsShipping()) {
      this.copyShippingToBilling();
    }
  }

  copyShippingToBilling() {
    const shipping = this.registerForm.get('shippingAddress')?.value;
    if (!shipping) return;

    // Copy the states list so billing dropdown has options
    this.billingStates = [...this.shippingStates];

    this.registerForm.get('billingAddress')?.patchValue({
      street: shipping.street,
      city: shipping.city,
      state: shipping.state,
      zipCode: shipping.zipCode,
      country: shipping.country,
    });
  }

  onBillingCountryChange() {
    const country = this.registerForm.get('billingAddress.country')?.value;
    if (country) {
      this.shopFormService.getStates(country).subscribe(data => {
        this.billingStates = data;
        this.registerForm.get('billingAddress.state')?.setValue('');
      });
    }
  }

  onLogin() {
    if (this.loginForm.invalid) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.cartService.onLogin(email);
        this.router.navigate(['/products']);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Invalid email or password');
      }
    });
  }

  onRegister() {
    // Check that base fields + shipping address are valid
    if (this.registerForm.get('firstName')?.invalid ||
        this.registerForm.get('lastName')?.invalid ||
        this.registerForm.get('email')?.invalid ||
        this.registerForm.get('password')?.invalid ||
        this.registerForm.get('shippingAddress')?.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    if (this.includeCard() && this.registerForm.get('creditCard')?.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage.set('Please complete the credit card details.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const f = this.registerForm.value;
    const shippingState = this.shippingStates.find(s => s.name === f.shippingAddress.state || s.id === +f.shippingAddress.state);
    const shippingCountry = this.countries.find(c => c.code === f.shippingAddress.country);

    const data: RegisterData = {
      firstName: f.firstName,
      lastName: f.lastName,
      email: f.email,
      password: f.password,
      shippingAddress: {
        street: f.shippingAddress.street,
        city: f.shippingAddress.city,
        state: shippingState?.name || f.shippingAddress.state,
        zipCode: f.shippingAddress.zipCode,
        country: shippingCountry?.name || f.shippingAddress.country,
      }
    };

    if (this.includeBilling() && f.billingAddress.street) {
      const billingState = this.billingStates.find(s => s.name === f.billingAddress.state || s.id === +f.billingAddress.state);
      const billingCountry = this.countries.find(c => c.code === f.billingAddress.country);
      data.billingAddress = {
        street: f.billingAddress.street,
        city: f.billingAddress.city,
        state: billingState?.name || f.billingAddress.state,
        zipCode: f.billingAddress.zipCode,
        country: billingCountry?.name || f.billingAddress.country,
      };
    }

    if (this.includeCard() && f.creditCard.cardNumber) {
      data.cardType = f.creditCard.cardType;
      data.nameOnCard = f.creditCard.nameOnCard;
      data.cardNumber = f.creditCard.cardNumber;
      data.cardExpirationMonth = +f.creditCard.expirationMonth;
      data.cardExpirationYear = +f.creditCard.expirationYear;
    }

    this.authService.register(data).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.cartService.onLogin(data.email);
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 400) {
          const body = err.error;
          if (typeof body === 'string' && body.includes('already in use')) {
            this.errorMessage.set('Email is already in use');
          } else if (typeof body === 'object' && body !== null) {
            const messages = Object.values(body).join('; ');
            this.errorMessage.set(messages || 'Please correct the highlighted fields.');
          } else {
            this.errorMessage.set('Registration failed. Please check your input.');
          }
        } else {
          this.errorMessage.set('Registration failed');
        }
      }
    });
  }
}
