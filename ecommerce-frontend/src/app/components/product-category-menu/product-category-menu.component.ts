import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ProductCategory } from '../../common/product-category.model';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-category-menu',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './product-category-menu.component.html',
  styleUrl: './product-category-menu.component.css',
})
export class ProductCategoryMenu implements OnInit {

  private readonly productService = inject(ProductService);
  productCategories = signal<ProductCategory[]>([]);

  ngOnInit(): void {
    this.listProductCategories();
  }

  listProductCategories() {
    this.productService.getProductCategories().subscribe({
      next: data => this.productCategories.set(data),
      error: err => console.error('Error fetching categories:', err)
    });
  }
}
