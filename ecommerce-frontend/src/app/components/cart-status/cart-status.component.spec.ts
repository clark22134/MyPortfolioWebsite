import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CartStatusComponent } from './cart-status.component';

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
});
