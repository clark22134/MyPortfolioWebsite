import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { GetResponseProducts, ProductService } from '../../services/product.service';
import { Product } from '../../common/product.model';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { CartItem } from '../../common/cart-item.model';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

interface PromoHighlight {
  readonly id: string;
  readonly tag: string;
  readonly title: string;
  readonly description: string;
  readonly cta: string;
  readonly iconClass: string;
  readonly categoryId: number;
  readonly productIds: number[];
}

@Component({
  selector: 'app-product-list',
  imports: [CurrencyPipe, NgbPagination],
  templateUrl: './product-list-grid.component.html',
  styleUrl: './product-list.component.css',
})
export class ProductListComponent implements OnInit, OnDestroy {

  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  authService = inject(AuthService);
  products = signal<Product[]>([]);
  currentCategoryId = signal<number>(1);
  previousCategoryId = signal<number>(1);
  searchMode = signal<boolean>(false);
  loading = signal<boolean>(true);
  selectedProduct = signal<Product | null>(null);
  selectedPromo = signal<PromoHighlight | null>(null);
  promoProducts = signal<Product[]>([]);
  promoLoading = signal<boolean>(false);
  totalPrice = signal<number>(0);
  totalQuantity = signal<number>(0);
  // categoryId/productIds reference backend seed data (sql_scripts/refresh-database-with-100-products-updated.sql) — keep in sync.
  readonly promoHighlights: PromoHighlight[] = [
    {
      id: 'ai-toolkit',
      tag: 'AI Toolkit Sale',
      title: 'AI Code & Ops Essentials',
      description: 'Save on AI reviewers, predictive monitors, and natural-language tooling.',
      cta: 'Shop AI Tools',
      iconClass: 'fa-laptop',
      categoryId: 1,
      productIds: [1, 3, 10, 16]
    },
    {
      id: 'dev-survival',
      tag: 'Limited-Time Drop',
      title: 'Developer Survival Picks',
      description: "Top-rated dev gear and productivity essentials at this week's best prices.",
      cta: 'See the Drop',
      iconClass: 'fa-bolt',
      categoryId: 2,
      productIds: [26, 30, 37, 45]
    },
    {
      id: 'spy-bundle',
      tag: 'Bundle & Save',
      title: 'Spy Tech Bundles',
      description: 'Stackable discounts on cybersecurity gadgets and surveillance kit.',
      cta: 'Bundle & Save',
      iconClass: 'fa-tags',
      categoryId: 3,
      productIds: [51, 58, 64, 72]
    }
  ];
  readonly dealInventoryTarget = 120;
  readonly dealRemainingUnits = signal<number>(37);
  private readonly dealPool = signal<Product[]>([]);
  readonly dealProduct = (): Product | null => {
    const pool = this.dealPool();
    if (pool.length === 0) return null;
    return pool[this.dayOfYear() % pool.length];
  };
  readonly dealUnitsSold = computed(() => {
    const soldUnits = this.dealInventoryTarget - this.dealRemainingUnits();
    return Math.min(this.dealInventoryTarget, Math.max(0, soldUnits));
  });
  readonly dealProgressPercent = computed(() => Math.round((this.dealUnitsSold() / this.dealInventoryTarget) * 100));

  private readonly dealDurationMs = 1000 * 60 * 60 * 8;
  private readonly dealEndsAtMs = signal<number>(Date.now() + this.dealDurationMs);
  private readonly currentTimeMs = signal<number>(Date.now());
  private dealCountdownTimer: ReturnType<typeof setInterval> | null = null;
  readonly dealCountdown = computed(() => {
    const remainingSeconds = Math.max(0, Math.floor((this.dealEndsAtMs() - this.currentTimeMs()) / 1000));
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    return { hours, minutes, seconds };
  });

  // new properties for pagination
  thePageNumber = signal<number>(1);
  thePageSize = signal<number>(8);
  theTotalElements = signal<number>(0);

  previousKeyword = signal<string>(null!);

  ngOnInit(): void {
    this.startDealCountdown();
    this.loadDealPool();
    this.route.paramMap.subscribe(() => {
      this.listProducts();
    });

    this.cartService.totalPrice.subscribe(data => this.totalPrice.set(data));
    this.cartService.totalQuantity.subscribe(data => this.totalQuantity.set(data));
  }

  ngOnDestroy(): void {
    if (this.dealCountdownTimer) {
      clearInterval(this.dealCountdownTimer);
      this.dealCountdownTimer = null;
    }
    document.body.style.overflow = '';
  }

  listProducts() {
    this.searchMode.set(this.route.snapshot.paramMap.has('keyword'));

    if (this.searchMode()) {
      this.handleSearchProducts();
    } else {
      this.handleListProducts();
    }
  }

  handleSearchProducts() {
    const theKeyword: string = this.route.snapshot.paramMap.get('keyword')!;

    // Reset to page 1 when the keyword changes
    if (this.previousKeyword() !== theKeyword) {
      this.thePageNumber.set(1);
    }
    this.previousKeyword.set(theKeyword);

    this.loading.set(true);
    this.productService.searchProductsPaginate(this.thePageNumber(),
                                              this.thePageSize(),
                                              theKeyword).subscribe(this.processResult());
  }

  processResult() {
    return (data: GetResponseProducts) => {
      // Spring Data REST omits `_embedded` when a page is empty, so guard for it.
      this.products.set(data._embedded?.products ?? []);
      this.thePageNumber.set(data.page.number + 1);
      this.thePageSize.set(data.page.size);
      this.theTotalElements.set(data.page.totalElements);
      this.loading.set(false);
    };
  }

  handleListProducts() {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.currentCategoryId.set(idParam ? +idParam : 1);

    // Angular reuses the component when navigating between categories — reset
    // to page 1 whenever the category changes so we don't request a page that
    // doesn't exist in the new category.
    if (this.currentCategoryId() !== this.previousCategoryId()) {
      this.thePageNumber.set(1);
    }
    this.previousCategoryId.set(this.currentCategoryId());

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

  openPromoModal(promo: PromoHighlight) {
    this.selectedPromo.set(promo);
    this.promoProducts.set([]);
    this.promoLoading.set(true);
    document.body.style.overflow = 'hidden';

    this.productService.getProductsByIds(promo.productIds).subscribe({
      next: products => {
        this.promoProducts.set(products);
        this.promoLoading.set(false);
      },
      error: () => {
        this.promoProducts.set([]);
        this.promoLoading.set(false);
      }
    });
  }

  closePromoModal() {
    this.selectedPromo.set(null);
    this.promoProducts.set([]);
    document.body.style.overflow = '';
  }

  viewPromoCategory() {
    const promo = this.selectedPromo();
    if (!promo) return;
    this.closePromoModal();
    this.router.navigateByUrl(`/category/${promo.categoryId}`);
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

  shouldRenderMidPagePromo(index: number): boolean {
    return this.products().length > 4 && index === 3;
  }

  viewDeal(product: Product) {
    this.openProductModal(product);
  }

  formatCountdown(value: number): string {
    return value.toString().padStart(2, '0');
  }

  private dayOfYear(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private loadDealPool() {
    this.productService.getProductListPaginate(1, 24, 1).subscribe({
      next: response => this.dealPool.set(response._embedded?.products ?? []),
      error: () => this.dealPool.set([])
    });
  }

  private startDealCountdown() {
    this.currentTimeMs.set(Date.now());
    this.dealCountdownTimer = setInterval(() => {
      const now = Date.now();
      this.currentTimeMs.set(now);

      if (now >= this.dealEndsAtMs()) {
        this.dealEndsAtMs.set(now + this.dealDurationMs);
        this.dealRemainingUnits.update(units => Math.max(8, units - 4));
      }
    }, 1000);
  }
}
