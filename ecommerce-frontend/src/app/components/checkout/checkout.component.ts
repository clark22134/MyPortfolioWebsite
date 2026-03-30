import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ShopFormService } from '../../services/shop-form.service';
import { ShopValidators } from '../../validators/shop-validators';
import { Country } from '../../common/country.model';
import { State } from '../../common/state.model';
import { CheckoutService } from '../../services/checkout.service';
import { AuthService, CustomerProfile } from '../../services/auth.service';
import { Order } from '../../common/order.model';
import { OrderItem } from '../../common/order-item.model';
import { Purchase } from '../../common/purchase.model';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, CurrencyPipe, RouterLink],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
})
export class CheckoutComponent implements OnInit {

  checkoutFormGroup!: FormGroup;
  totalPrice: number = 0;
  totalQuantity: number = 0;

  countries: Country[] = [];
  shippingStates: State[] = [];
  billingStates: State[] = [];

  creditCardYears: number[] = [];
  creditCardMonths: number[] = [];

  // Saved profile data
  customerProfile: CustomerProfile | null = null;
  useSavedShipping = signal(false);
  useSavedBilling = signal(false);
  useSavedCard = signal(false);

  constructor(
    private formBuilder: FormBuilder,
    private cartService: CartService,
    private checkoutService: CheckoutService,
    private shopFormService: ShopFormService,
    private router: Router,
    public authService: AuthService
  ) {}

  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  ngOnInit(): void {
    this.checkoutFormGroup = this.formBuilder.group({
      customer: this.formBuilder.group({
        firstName: ['', [Validators.required, Validators.minLength(2), ShopValidators.notOnlyWhitespace]],
        lastName: ['', [Validators.required, Validators.minLength(2), ShopValidators.notOnlyWhitespace]],
        email: ['', [Validators.required, Validators.pattern('^[\\w.+-]+@[\\w-]+\\.[a-zA-Z]{2,}$')]],
      }),
      shippingAddress: this.formBuilder.group({
        street: ['', [Validators.required, ShopValidators.notOnlyWhitespace]],
        city: ['', [Validators.required, ShopValidators.notOnlyWhitespace]],
        state: ['', Validators.required],
        zipCode: ['', [Validators.required, ShopValidators.notOnlyWhitespace]],
        country: ['', Validators.required],
      }),
      billingAddress: this.formBuilder.group({
        street: ['', [Validators.required, ShopValidators.notOnlyWhitespace]],
        city: ['', [Validators.required, ShopValidators.notOnlyWhitespace]],
        state: ['', Validators.required],
        zipCode: ['', [Validators.required, ShopValidators.notOnlyWhitespace]],
        country: ['', Validators.required],
      }),
      creditCard: this.formBuilder.group({
        cardType: ['', Validators.required],
        nameOnCard: ['', [Validators.required, ShopValidators.notOnlyWhitespace]],
        cardNumber: ['', [Validators.required, Validators.pattern('[0-9]{16}')]],
        expirationMonth: ['', Validators.required],
        expirationYear: ['', Validators.required],
        securityCode: ['', [Validators.required, Validators.pattern('[0-9]{3}')]],
      }),
    });

    this.cartService.totalPrice.subscribe(data => this.totalPrice = data);
    this.cartService.totalQuantity.subscribe(data => this.totalQuantity = data);
    this.cartService.computeCartTotals();

    this.shopFormService.getCountries().subscribe(data => this.countries = data);

    this.shopFormService.getCreditCardYears().subscribe(data => this.creditCardYears = data);

    const startMonth = new Date().getMonth() + 1;
    this.shopFormService.getCreditCardMonths(startMonth).subscribe(data => this.creditCardMonths = data);

    // If logged in, fetch profile and pre-fill customer info
    if (this.isLoggedIn) {
      this.authService.getProfile().subscribe({
        next: (profile) => {
          this.customerProfile = profile;
          // Pre-fill customer name + email
          this.checkoutFormGroup.get('customer')?.patchValue({
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
          });
        },
        error: () => {
          // Profile fetch failed, user fills manually
        }
      });
    }
  }

  toggleUseSavedShipping() {
    const next = !this.useSavedShipping();
    this.useSavedShipping.set(next);
    if (next && this.customerProfile?.defaultShippingAddress) {
      this.fillAddressGroup('shippingAddress', this.customerProfile.defaultShippingAddress);
    } else {
      this.checkoutFormGroup.get('shippingAddress')?.reset();
    }
  }

  toggleUseSavedBilling() {
    const next = !this.useSavedBilling();
    this.useSavedBilling.set(next);
    if (next && this.customerProfile?.defaultBillingAddress) {
      this.fillAddressGroup('billingAddress', this.customerProfile.defaultBillingAddress);
    } else {
      this.checkoutFormGroup.get('billingAddress')?.reset();
    }
  }

  toggleUseSavedCard() {
    const next = !this.useSavedCard();
    this.useSavedCard.set(next);
    if (next && this.customerProfile) {
      this.checkoutFormGroup.get('creditCard')?.patchValue({
        cardType: this.customerProfile.cardType ?? '',
        nameOnCard: this.customerProfile.nameOnCard ?? '',
        expirationMonth: this.customerProfile.cardExpirationMonth ?? '',
        expirationYear: this.customerProfile.cardExpirationYear ?? '',
        // cardNumber and security code must be entered fresh for security
      });
    } else {
      this.checkoutFormGroup.get('creditCard')?.reset();
    }
  }

  private fillAddressGroup(groupName: string, addr: { street: string; city: string; state: string; zipCode: string; country: string }) {
    // Find matching country object
    const matchedCountry = this.countries.find(c => c.name === addr.country);
    if (matchedCountry) {
      this.shopFormService.getStates(matchedCountry.code).subscribe(states => {
        if (groupName === 'shippingAddress') {
          this.shippingStates = states;
        } else {
          this.billingStates = states;
        }
        const matchedState = states.find(s => s.name === addr.state);
        this.checkoutFormGroup.get(groupName)?.patchValue({
          street: addr.street,
          city: addr.city,
          country: matchedCountry,
          state: matchedState ?? '',
          zipCode: addr.zipCode,
        });
      });
    }
  }

  onExpirationYearChange() {
    const currentYear = new Date().getFullYear();
    const selectedYear = +this.checkoutFormGroup.get('creditCard.expirationYear')?.value;
    const startMonth = selectedYear === currentYear ? new Date().getMonth() + 1 : 1;

    this.shopFormService.getCreditCardMonths(startMonth).subscribe(data => {
      this.creditCardMonths = data;

      const currentMonth = this.checkoutFormGroup.get('creditCard.expirationMonth')?.value;
      if (currentMonth && !this.creditCardMonths.includes(+currentMonth)) {
        this.checkoutFormGroup.get('creditCard.expirationMonth')?.setValue('');
      }
    });
  }

  get customer() { return this.checkoutFormGroup.get('customer'); }
  get shippingAddress() { return this.checkoutFormGroup.get('shippingAddress'); }
  get billingAddress() { return this.checkoutFormGroup.get('billingAddress'); }
  get creditCard() { return this.checkoutFormGroup.get('creditCard'); }

  copyShippingToBilling(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.billingStates = this.shippingStates;
      this.checkoutFormGroup.controls['billingAddress']
        .setValue(this.checkoutFormGroup.controls['shippingAddress'].value);
    } else {
      this.billingStates = [];
      this.checkoutFormGroup.controls['billingAddress'].reset();
    }
  }

  onShippingCountryChange() {
    const country = this.checkoutFormGroup.get('shippingAddress.country')?.value;
    this.shopFormService.getStates(country.code).subscribe(data => {
      this.shippingStates = data;
      this.checkoutFormGroup.get('shippingAddress.state')?.setValue('');
    });
  }

  onBillingCountryChange() {
    const country = this.checkoutFormGroup.get('billingAddress.country')?.value;
    this.shopFormService.getStates(country.code).subscribe(data => {
      this.billingStates = data;
      this.checkoutFormGroup.get('billingAddress.state')?.setValue('');
    });
  }

  onSubmit() {
    if (this.checkoutFormGroup.invalid) {
      this.checkoutFormGroup.markAllAsTouched();
      return;
    }

    // set up order
    let order = new Order();
    order.totalPrice = this.totalPrice;
    order.totalQuantity = this.totalQuantity;

    // get cart items
    const cartItems = this.cartService.cartItems;

    // create orderItems from cartItems
    let orderItems: OrderItem[] = cartItems.map(tempCartItem => new OrderItem(tempCartItem));

    // set up and populate purchase (customer, shipping and billing address, order and orderItems)
    let purchase = new Purchase();

    // customer
    purchase.customer = this.checkoutFormGroup.controls['customer']?.value;

    // shipping address
    purchase.shippingAddress = this.checkoutFormGroup.controls['shippingAddress']?.value;
    const shippingState: State = JSON.parse(JSON.stringify(purchase.shippingAddress.state));
    const shippingCountry: Country = JSON.parse(JSON.stringify(purchase.shippingAddress.country));
    purchase.shippingAddress.state = shippingState.name;
    purchase.shippingAddress.country = shippingCountry.name;

    // billing address
    purchase.billingAddress = this.checkoutFormGroup.controls['billingAddress']?.value;
    const billingState: State = JSON.parse(JSON.stringify(purchase.billingAddress.state));
    const billingCountry: Country = JSON.parse(JSON.stringify(purchase.billingAddress.country));
    purchase.billingAddress.state = billingState.name;
    purchase.billingAddress.country = billingCountry.name;

    // order
    purchase.order = order;
    purchase.orderItems = orderItems;

    // call REST API via the CheckoutService
    this.checkoutService.placeOrder(purchase).subscribe({
      next: response => { // success/happy path
        alert(`Order placed successfully. Order tracking number: ${response.orderTrackingNumber}`);
        this.resetCart();
      },
      error: err => { // something went wrong
        alert(`There was an error: ${err.message}`);
      }
    });

  }
  resetCart() {
    // reset cart data (also syncs to server)
    this.cartService.clearCart();

    // reset the form
    this.checkoutFormGroup.reset();

    // navigate back to the products (main) page
    this.router.navigate(['/products']);
  }
}
