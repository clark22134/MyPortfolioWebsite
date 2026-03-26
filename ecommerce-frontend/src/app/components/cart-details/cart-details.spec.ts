import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CartDetails } from './cart-details';

describe('CartDetails', () => {
  let component: CartDetails;
  let fixture: ComponentFixture<CartDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(CartDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
