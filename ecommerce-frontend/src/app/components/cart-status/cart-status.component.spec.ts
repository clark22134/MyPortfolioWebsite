import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CartStatusComponent } from './cart-status.component';
import { CartService } from '../../services/cart.service';

describe('CartStatusComponent', () => {
  let component: CartStatusComponent;
  let fixture: ComponentFixture<CartStatusComponent>;

  beforeEach(async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [CartStatusComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CartStatusComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize totalPrice to 0', () => {
    fixture.detectChanges();
    expect(component.totalPrice).toBe(0);
  });

  it('should initialize totalQuantity to 0', () => {
    fixture.detectChanges();
    expect(component.totalQuantity).toBe(0);
  });

  it('should update totalPrice from cartService', () => {
    const cartService = TestBed.inject(CartService);
    fixture.detectChanges();
    cartService.totalPrice.next(99.99);
    expect(component.totalPrice).toBe(99.99);
  });

  it('should update totalQuantity from cartService', () => {
    const cartService = TestBed.inject(CartService);
    fixture.detectChanges();
    cartService.totalQuantity.next(3);
    expect(component.totalQuantity).toBe(3);
  });

  it('should render cart status in template', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toBeTruthy();
  });
});
