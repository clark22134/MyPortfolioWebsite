import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CartStatusComponent } from './cart-status';

describe('CartStatusComponent', () => {
  let component: CartStatusComponent;
  let fixture: ComponentFixture<CartStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartStatusComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CartStatusComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
