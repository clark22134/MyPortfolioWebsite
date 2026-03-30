import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductCategoryMenu } from './product-category-menu.component';

describe('ProductCategoryMenu', () => {
  let component: ProductCategoryMenu;
  let fixture: ComponentFixture<ProductCategoryMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCategoryMenu],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCategoryMenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
