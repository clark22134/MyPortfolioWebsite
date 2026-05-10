import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CurrencyPipe } from '@angular/common';

import { CartDetailsComponent } from './cart-details.component';
import { CartService } from '../../services/cart.service';
import { CartItem } from '../../common/cart-item.model';
import { Product } from '../../common/product.model';

const mockProduct = new Product(1, 'BOOK-1000', 'Test Book', 'desc', 19.99, 'img.jpg', true, 100, new Date(), new Date());

describe('CartDetailsComponent', () => {
  let component: CartDetailsComponent;
  let fixture: ComponentFixture<CartDetailsComponent>;
  let cartService: CartService;

  beforeEach(async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [CartDetailsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CartDetailsComponent);
    component = fixture.componentInstance;
    cartService = TestBed.inject(CartService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty cart', () => {
    fixture.detectChanges();
    expect(component.totalPrice).toBe(0);
    expect(component.totalQuantity).toBe(0);
  });

  it('should update totalPrice from cartService', () => {
    fixture.detectChanges();
    cartService.totalPrice.next(49.99);
    expect(component.totalPrice).toBe(49.99);
  });

  it('should update totalQuantity from cartService', () => {
    fixture.detectChanges();
    cartService.totalQuantity.next(3);
    expect(component.totalQuantity).toBe(3);
  });

  it('should load cartItems from cartService', () => {
    const item = new CartItem(mockProduct);
    cartService.cartItems = [item];
    fixture.detectChanges();
    expect(component.cartItems.length).toBe(1);
  });

  it('should increment quantity of cart item', () => {
    fixture.detectChanges();
    const item = new CartItem(mockProduct);
    vi.spyOn(cartService, 'addToCart').mockImplementation(() => {});
    component.incrementQuantity(item);
    expect(cartService.addToCart).toHaveBeenCalledWith(item);
  });

  it('should decrement quantity of cart item', () => {
    fixture.detectChanges();
    const item = new CartItem(mockProduct);
    vi.spyOn(cartService, 'decrementQuantity').mockImplementation(() => {});
    component.decrementQuantity(item);
    expect(cartService.decrementQuantity).toHaveBeenCalledWith(item);
  });

  it('should remove cart item', () => {
    fixture.detectChanges();
    const item = new CartItem(mockProduct);
    vi.spyOn(cartService, 'remove').mockImplementation(() => {});
    component.remove(item);
    expect(cartService.remove).toHaveBeenCalledWith(item);
  });

  it('should render cart items in template', () => {
    const item = new CartItem(mockProduct);
    item.quantity = 2;
    cartService.cartItems = [item];
    cartService.totalPrice.next(39.98);
    cartService.totalQuantity.next(2);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Test Book');
  });

  it('should render empty cart message when no items', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toBeTruthy();
  });
});
