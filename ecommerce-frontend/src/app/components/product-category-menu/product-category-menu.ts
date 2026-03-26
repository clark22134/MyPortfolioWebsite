import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ProductCategory } from '../../common/product-category';
import { ProductService } from '../../services/product';

@Component({
  selector: 'app-product-category-menu',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './product-category-menu.html',
  styleUrl: './product-category-menu.css',
})
export class ProductCategoryMenu implements OnInit {

  private productService = inject(ProductService);
  productCategories = signal<ProductCategory[]>([]);
  categoriesExpanded = signal(true);

  ngOnInit(): void {
    this.listProductCategories();
  }

  toggleCategories() {
    this.categoriesExpanded.update(v => !v);
  }

  listProductCategories() {
    this.productService.getProductCategories().subscribe({
      next: data => {
        this.productCategories.set(data);
      },
      error: err => {
        console.error('Error fetching categories:', err);
      }
    });
  }
}
