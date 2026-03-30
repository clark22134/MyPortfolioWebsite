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
