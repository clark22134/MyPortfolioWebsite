import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { GetResponseProducts, ProductService } from '../../services/product.service';
import { Product } from '../../common/product.model';
import { ActivatedRoute } from '@angular/router';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { CartItem } from '../../common/cart-item.model';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-product-list',
  imports: [CurrencyPipe, NgbPagination],
  templateUrl: './product-list-grid.component.html',
  styleUrl: './product-list.component.css',
})
export class ProductListComponent implements OnInit {

  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private route = inject(ActivatedRoute);
  authService = inject(AuthService);
  products = signal<Product[]>([]);
  currentCategoryId = signal<number>(1);
  previousCategoryId = signal<number>(1);
  searchMode = signal<boolean>(false);
  loading = signal<boolean>(true);
  selectedProduct = signal<Product | null>(null);
  totalPrice = signal<number>(0);
  totalQuantity = signal<number>(0);

  // new properties for pagination
  thePageNumber = signal<number>(1);
  thePageSize = signal<number>(8);
  theTotalElements = signal<number>(0);

  previousKeyword = signal<string>(null!);

  ngOnInit(): void {
    this.route.paramMap.subscribe(() => {
      this.listProducts();
    });

    this.cartService.totalPrice.subscribe(data => this.totalPrice.set(data));
    this.cartService.totalQuantity.subscribe(data => this.totalQuantity.set(data));
  }

  listProducts() {
    this.searchMode.set(this.route.snapshot.paramMap.has('keyword'));

    if (this.searchMode()) {
      this.handleSearchProducts();
    }
    else {
      this.handleListProducts();
    }
  }


  handleSearchProducts() {
    const theKeyword: string = this.route.snapshot.paramMap.get('keyword')!;

    // if we have a different keyword than previous then set thePageNumber to 1
    if (this.previousKeyword() !== theKeyword) {
      this.thePageNumber.set(1);
    }
    this.previousKeyword.set(theKeyword);

    // now search for the products using keyword
    this.loading.set(true);
    this.productService.searchProductsPaginate(this.thePageNumber(),
                                              this.thePageSize(),
                                              theKeyword).subscribe(this.processResult());
  }

  processResult() {
    return (data: GetResponseProducts) => {
      this.products.set(data._embedded.products);
      this.thePageNumber.set(data.page.number + 1);
      this.thePageSize.set(data.page.size);
      this.theTotalElements.set(data.page.totalElements);
      this.loading.set(false);
    };
  }

  handleListProducts() {

    // check if "id" parameter is available
    const hasCategoryId: boolean = this.route.snapshot.paramMap.has('id');

    if (hasCategoryId) {
      // get the "id" parameter string. convert string to a number using the "+" symbol
      this.currentCategoryId.set(+this.route.snapshot.paramMap.get('id')!);
    }
    else {
      // not category id available ... default to category id 1
      this.currentCategoryId.set(1);
    }

    // Check if we have a different category than previous
    // Note: Angular will reuse a component if it is currently being viewed
    // if we have a different category id than previous then set thePageNumber back to 1
    if (this.currentCategoryId() !== this.previousCategoryId()) {
      this.thePageNumber.set(1);
    }
    this.previousCategoryId.set(this.currentCategoryId());

    // now get the products for the given category id
    this.loading.set(true);
    this.productService.getProductListPaginate(this.thePageNumber(),
                                              this.thePageSize(),
                                              this.currentCategoryId()).subscribe(this.processResult());
  }

  updatePageSize(pageSize: string) {
    if (pageSize === 'all') {
      this.thePageSize.set(this.theTotalElements());
    } else {
      this.thePageSize.set(+pageSize);
    }
    this.thePageNumber.set(1);
    this.listProducts();
  }

  openProductModal(product: Product) {
    this.selectedProduct.set(product);
    document.body.style.overflow = 'hidden';
  }

  closeProductModal() {
    this.selectedProduct.set(null);
    document.body.style.overflow = '';
  }

  addToCart(theProduct: Product) {
    const theCartItem = new CartItem(theProduct);
    if (this.authService.isAuthenticated()) {
      theCartItem.unitPrice = +(theProduct.unitPrice * 0.7).toFixed(2);
    }
    this.cartService.addToCart(theCartItem);
  }

  getMemberPrice(price: number): number {
    return +(price * 0.7).toFixed(2);
  }

  getCartQuantity(product: Product): number {
    const item = this.cartService.cartItems.find(i => i.id === product.id);
    return item ? item.quantity : 0;
  }

  incrementInCart(product: Product) {
    const theCartItem = new CartItem(product);
    this.cartService.addToCart(theCartItem);
  }

  decrementInCart(product: Product) {
    const item = this.cartService.cartItems.find(i => i.id === product.id);
    if (item) {
      this.cartService.decrementQuantity(item);
    }
  }

  removeFromCart(product: Product) {
    const item = this.cartService.cartItems.find(i => i.id === product.id);
    if (item) {
      this.cartService.remove(item);
    }
  }
}
