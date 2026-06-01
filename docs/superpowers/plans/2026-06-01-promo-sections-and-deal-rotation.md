# Promo Sections & Deal-of-the-Day Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three placeholder promo cards on the ecommerce product list with on-brand, curated-pick modals, and rotate Deal of the Day deterministically by day-of-year.

**Architecture:** Frontend-only Angular changes. `ProductListComponent` gains promo-modal state and a rotating `dealProduct` computed signal backed by a pre-fetched pool. `ProductService` adds a `getProductsByIds` method that fans out existing `GET /api/products/{id}` calls via `forkJoin`. New modal block lives in the existing template.

**Tech Stack:** Angular (signals API), RxJS (`forkJoin`, `of`), Vitest (`vi` API) for unit tests, `ng test` (`vitest`) runner, `@angular/router`, `@angular/common/http/testing`.

**Spec:** `docs/superpowers/specs/2026-06-01-promo-sections-and-deal-rotation-design.md`

---

## File Map

**Modify:**
- `ecommerce-frontend/src/app/services/product.service.ts` — add `getProductsByIds`.
- `ecommerce-frontend/src/app/services/product.service.spec.ts` — tests for `getProductsByIds`.
- `ecommerce-frontend/src/app/components/product-list/product-list.component.ts` — promo data, modal state, deal rotation, lifecycle.
- `ecommerce-frontend/src/app/components/product-list/product-list.component.spec.ts` — tests for promo modal + deal rotation.
- `ecommerce-frontend/src/app/components/product-list/product-list-grid.component.html` — promo CTAs and new modal block.
- `ecommerce-frontend/src/app/components/product-list/product-list.component.css` — modal styles.

**Create:** none.

---

## Conventions

- Tests use Vitest (`vi.spyOn`, `vi.useFakeTimers`, etc.) with `@angular/core/testing` `TestBed`.
- Run commands from `ecommerce-frontend/`:
  - Single file: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/components/product-list/product-list.component.spec.ts'`
  - Or simpler: `npm test -- --watch=false` (runs full suite).
- Commits are user-controlled — **do not run `git add` or `git commit`**. After each task, stop at "Ready to commit (user runs)."

---

## Task 1: Add `getProductsByIds` to `ProductService`

**Files:**
- Modify: `ecommerce-frontend/src/app/services/product.service.ts`
- Test: `ecommerce-frontend/src/app/services/product.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `product.service.spec.ts` (inside the existing `describe('ProductService', ...)` block, before its closing `});`):

```ts
  it('should return empty array immediately for getProductsByIds([])', () => {
    let emitted: any = null;
    service.getProductsByIds([]).subscribe(result => { emitted = result; });
    expect(emitted).toEqual([]);
    httpMock.expectNone(() => true);
  });

  it('should fetch multiple products by id in input order', () => {
    const productA = { id: 1, name: 'Alpha', unitPrice: 1 };
    const productB = { id: 5, name: 'Bravo', unitPrice: 2 };
    let emitted: any[] = [];

    service.getProductsByIds([1, 5]).subscribe(result => { emitted = result; });

    const req1 = httpMock.expectOne('/api/products/1');
    const req5 = httpMock.expectOne('/api/products/5');
    expect(req1.request.method).toBe('GET');
    expect(req5.request.method).toBe('GET');

    // Flush out of input order to prove the method preserves input order.
    req5.flush(productB);
    req1.flush(productA);

    expect(emitted.map(p => p.id)).toEqual([1, 5]);
  });
```

- [ ] **Step 2: Run tests, verify they fail**

```
cd ecommerce-frontend
npm test -- --watch=false --include='src/app/services/product.service.spec.ts'
```

Expected: both new tests fail because `getProductsByIds` does not exist.

- [ ] **Step 3: Implement `getProductsByIds`**

Edit `product.service.ts`. Update the top import to add `forkJoin` and `of`:

```ts
import { forkJoin, map, Observable, of } from 'rxjs';
```

Add the method inside the `ProductService` class (e.g., right after `getProduct`):

```ts
  getProductsByIds(ids: number[]): Observable<Product[]> {
    if (ids.length === 0) {
      return of([]);
    }
    return forkJoin(ids.map(id => this.getProduct(id)));
  }
```

- [ ] **Step 4: Run tests, verify they pass**

```
npm test -- --watch=false --include='src/app/services/product.service.spec.ts'
```

Expected: all tests in `product.service.spec.ts` pass.

- [ ] **Step 5: Ready to commit (user runs)**

Suggested message:

```
feat(ecommerce-frontend): add ProductService.getProductsByIds for curated picks
```

---

## Task 2: Add promo data model with `productIds` and `categoryId`

**Files:**
- Modify: `ecommerce-frontend/src/app/components/product-list/product-list.component.ts`

- [ ] **Step 1: Update the `PromoHighlight` interface**

Replace the existing interface at the top of `product-list.component.ts`:

```ts
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
```

- [ ] **Step 2: Replace `promoHighlights` data**

Replace the existing `readonly promoHighlights: PromoHighlight[] = [...]` block (currently `product-list.component.ts:39-61`) with:

```ts
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
```

- [ ] **Step 3: Run existing component tests to confirm nothing broke**

```
npm test -- --watch=false --include='src/app/components/product-list/product-list.component.spec.ts'
```

Expected: all existing tests still pass. (The template still references `promo.tag/title/description/cta/iconClass`, all of which are present.)

- [ ] **Step 4: Ready to commit (user runs)**

Suggested message:

```
feat(ecommerce-frontend): rebrand promo cards to fit dev-tooling catalog
```

---

## Task 3: Add `getProductsByIds`-backed promo modal state + open/close

**Files:**
- Modify: `ecommerce-frontend/src/app/components/product-list/product-list.component.ts`
- Test: `ecommerce-frontend/src/app/components/product-list/product-list.component.spec.ts`

- [ ] **Step 1: Write failing tests**

Add inside the `describe('ProductListComponent', ...)` block in `product-list.component.spec.ts`, before its closing `});`:

```ts
  describe('promo modal', () => {
    beforeEach(() => {
      fixture.detectChanges();
      httpMock.expectOne(req => req.url.includes('findByCategoryId')).flush(mockResponse);
    });

    it('opens the promo modal, fetches curated products, then clears loading', () => {
      const promo = component.promoHighlights[0]; // ai-toolkit, ids [1,3,10,16]

      component.openPromoModal(promo);

      expect(component.selectedPromo()).toBe(promo);
      expect(component.promoLoading()).toBe(true);
      expect(component.promoProducts()).toEqual([]);

      // forkJoin issues one GET per id.
      const reqs = promo.productIds.map(id => httpMock.expectOne(`/api/products/${id}`));
      reqs.forEach((req, idx) => {
        req.flush({ ...mockProduct, id: promo.productIds[idx], name: `P${promo.productIds[idx]}` });
      });

      expect(component.promoLoading()).toBe(false);
      expect(component.promoProducts().map(p => p.id)).toEqual(promo.productIds);
    });

    it('closes the promo modal and clears state', () => {
      const promo = component.promoHighlights[0];
      component.openPromoModal(promo);
      promo.productIds.forEach(id => {
        httpMock.expectOne(`/api/products/${id}`).flush({ ...mockProduct, id });
      });

      component.closePromoModal();

      expect(component.selectedPromo()).toBeNull();
      expect(component.promoProducts()).toEqual([]);
      expect(document.body.style.overflow).toBe('');
    });

    it('navigates to the promo category and closes the modal', () => {
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      const promo = component.promoHighlights[1]; // dev-survival, categoryId 2
      component.openPromoModal(promo);
      promo.productIds.forEach(id => {
        httpMock.expectOne(`/api/products/${id}`).flush({ ...mockProduct, id });
      });

      component.viewPromoCategory();

      expect(navSpy).toHaveBeenCalledWith('/category/2');
      expect(component.selectedPromo()).toBeNull();
    });
  });
```

At the top of `product-list.component.spec.ts`, add `Router` to the existing router import. Replace:

```ts
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
```

with:

```ts
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
```

- [ ] **Step 2: Run tests, verify they fail**

```
npm test -- --watch=false --include='src/app/components/product-list/product-list.component.spec.ts'
```

Expected: the three new promo-modal tests fail with errors like "openPromoModal is not a function".

- [ ] **Step 3: Add modal state and methods to the component**

Edit `product-list.component.ts`. Update the imports at the top to add `Router`:

```ts
import { ActivatedRoute, Router } from '@angular/router';
```

Inside the `ProductListComponent` class, add the router injection (next to the existing `route` injection):

```ts
  private readonly router = inject(Router);
```

Add the new signals (next to `selectedProduct`):

```ts
  selectedPromo = signal<PromoHighlight | null>(null);
  promoProducts = signal<Product[]>([]);
  promoLoading = signal<boolean>(false);
```

Add three methods inside the class (place them after `closeProductModal`):

```ts
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
```

- [ ] **Step 4: Run tests, verify they pass**

```
npm test -- --watch=false --include='src/app/components/product-list/product-list.component.spec.ts'
```

Expected: the three new tests pass; existing tests still pass.

- [ ] **Step 5: Ready to commit (user runs)**

Suggested message:

```
feat(ecommerce-frontend): add promo-modal state and open/close/navigate methods
```

---

## Task 4: Replace `dealProduct` with deterministic day-of-year rotation

**Files:**
- Modify: `ecommerce-frontend/src/app/components/product-list/product-list.component.ts`
- Test: `ecommerce-frontend/src/app/components/product-list/product-list.component.spec.ts`

- [ ] **Step 1: Write failing tests**

Add inside the `describe('ProductListComponent', ...)` block, before its closing `});`:

```ts
  describe('Deal of the Day rotation', () => {
    function makeProduct(id: number, name: string): Product {
      return new Product(id, `SKU-${id}`, name, 'desc', 10, 'img.png', true, 5, new Date(), new Date());
    }

    it('returns null while the deal pool is empty', () => {
      expect(component.dealProduct()).toBeNull();
    });

    it('picks the same product across reads on the same day, different on the next day', () => {
      const pool = [makeProduct(1, 'A'), makeProduct(2, 'B'), makeProduct(3, 'C'), makeProduct(4, 'D')];
      (component as any).dealPool.set(pool);

      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 1, 9, 0, 0));   // June 1
      const dayOne = component.dealProduct();
      const dayOneAgain = component.dealProduct();
      expect(dayOne).toBe(dayOneAgain);

      vi.setSystemTime(new Date(2026, 5, 2, 9, 0, 0));   // June 2
      const dayTwo = component.dealProduct();
      expect(dayTwo).not.toBe(dayOne);

      vi.useRealTimers();
    });

    it('loads the deal pool from category 1 on init', () => {
      fixture.detectChanges();

      // The main listing call (handled in existing tests).
      httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('page=0&size=8'))
        .flush(mockResponse);

      // The new deal-pool call: page=0, size=24, category 1.
      const dealReq = httpMock.expectOne(req =>
        req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24'));
      const poolResponse = {
        _embedded: { products: [makeProduct(11, 'X'), makeProduct(12, 'Y')] },
        page: { size: 24, totalElements: 2, totalPages: 1, number: 0 }
      };
      dealReq.flush(poolResponse);

      expect(component.dealProduct()).not.toBeNull();
    });
  });
```

- [ ] **Step 2: Run tests, verify they fail**

```
npm test -- --watch=false --include='src/app/components/product-list/product-list.component.spec.ts'
```

Expected: at minimum, "loads the deal pool" fails (no second HTTP call yet); rotation tests may pass spuriously because `products()[0]` is set — confirm one of them fails by date comparison.

- [ ] **Step 3: Replace `dealProduct` and add rotation helpers**

Edit `product-list.component.ts`.

Remove the existing line:

```ts
  readonly dealProduct = computed(() => this.products()[0] ?? null);
```

In its place add:

```ts
  private readonly dealPool = signal<Product[]>([]);
  readonly dealProduct = computed(() => {
    const pool = this.dealPool();
    if (pool.length === 0) return null;
    return pool[this.dayOfYear() % pool.length];
  });
```

Add two private helpers (place them near `startDealCountdown`):

```ts
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
```

Wire `loadDealPool()` into `ngOnInit`. Replace the existing `ngOnInit` body:

```ts
  ngOnInit(): void {
    this.startDealCountdown();
    this.loadDealPool();
    this.route.paramMap.subscribe(() => {
      this.listProducts();
    });

    this.cartService.totalPrice.subscribe(data => this.totalPrice.set(data));
    this.cartService.totalQuantity.subscribe(data => this.totalQuantity.set(data));
  }
```

- [ ] **Step 4: Run tests, verify they pass**

```
npm test -- --watch=false --include='src/app/components/product-list/product-list.component.spec.ts'
```

Expected: all rotation tests pass. Some existing tests may now fail because they don't flush the new `size=24` deal-pool request. If so:

For each existing test that calls `fixture.detectChanges()` and was previously flushing exactly one `findByCategoryId` request, add an additional flush:

```ts
httpMock.expectOne(req => req.url.includes('findByCategoryId?id=1') && req.url.includes('size=24'))
  .flush(emptyResponse);
```

immediately after the existing listing flush. Use the test from "loads the deal pool from category 1 on init" as a reference. Repeat until `npm test` shows zero failures.

- [ ] **Step 5: Run the full spec, verify green**

```
npm test -- --watch=false --include='src/app/components/product-list/product-list.component.spec.ts'
```

Expected: 100% pass.

- [ ] **Step 6: Ready to commit (user runs)**

Suggested message:

```
feat(ecommerce-frontend): rotate Deal of the Day deterministically by day-of-year
```

---

## Task 5: Wire promo CTAs and add the new modal template

**Files:**
- Modify: `ecommerce-frontend/src/app/components/product-list/product-list-grid.component.html`

- [ ] **Step 1: Change each promo card CTA**

Locate the promo card CTA (currently around `product-list-grid.component.html:28`):

```html
<button class="hero-highlight-cta" (click)="dealProduct() && viewDeal(dealProduct()!)" [disabled]="!dealProduct()">
```

Replace with:

```html
<button class="hero-highlight-cta" (click)="openPromoModal(promo)">
```

(Keep the inner `<i>` icon and `{{ promo.cta }}` text unchanged.)

- [ ] **Step 2: Add the new promo modal block**

At the very bottom of the template file, after the existing `@if (selectedProduct()) { ... }` block, append:

```html
<!-- Curated Promo Modal -->
@if (selectedPromo()) {
<div class="modal-overlay" (click)="closePromoModal()">
  <div class="modal-content promo-modal-content" (click)="$event.stopPropagation()">
    <button class="modal-close" (click)="closePromoModal()">
      <i class="fa fa-times"></i>
    </button>

    <div class="promo-modal-header">
      <span class="promo-modal-tag">{{ selectedPromo()!.tag }}</span>
      <h3>{{ selectedPromo()!.title }}</h3>
      <p>{{ selectedPromo()!.description }}</p>
    </div>

    @if (promoLoading()) {
    <div class="promo-modal-loading">
      <i class="fa fa-spinner fa-spin" aria-hidden="true"></i> Loading curated picks…
    </div>
    } @else {
    <div class="promo-modal-grid">
      @for (product of promoProducts(); track product.id) {
      <div class="promo-modal-card">
        <img [src]="product.imageUrl" [alt]="product.name" class="promo-modal-image">
        <h4 class="promo-modal-name">{{ product.name }}</h4>
        @if (authService.isAuthenticated()) {
        <div class="price-vip-wrap">
          <span class="price-original">{{ product.unitPrice | currency: 'USD' }}</span>
          <span class="price-member">{{ getMemberPrice(product.unitPrice) | currency: 'USD' }}</span>
        </div>
        } @else {
        <div class="price">{{ product.unitPrice | currency: 'USD' }}</div>
        }
        <button class="btn-add-to-cart promo-modal-add" (click)="addToCart(product)">
          <i class="fa fa-cart-plus" aria-hidden="true"></i> Add to Cart
        </button>
      </div>
      }
    </div>
    }

    <div class="promo-modal-footer">
      <button class="promo-modal-view-all" (click)="viewPromoCategory()">
        View all in category <i class="fa fa-arrow-right" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</div>
}
```

- [ ] **Step 3: Run full frontend test suite**

```
npm test -- --watch=false
```

Expected: all tests pass. Template-render tests for the promo modal are not required for this task (already covered by component-level tests in Task 3).

- [ ] **Step 4: Ready to commit (user runs)**

Suggested message:

```
feat(ecommerce-frontend): wire promo cards to curated-picks modal
```

---

## Task 6: Style the promo modal

**Files:**
- Modify: `ecommerce-frontend/src/app/components/product-list/product-list.component.css`

- [ ] **Step 1: Append modal styles**

Append to the end of `product-list.component.css`:

```css
/* ===== Curated Promo Modal ===== */
.promo-modal-content {
  max-width: 960px;
  width: 92vw;
  padding: 1.5rem 1.75rem;
}

.promo-modal-header {
  text-align: center;
  margin-bottom: 1.25rem;
}

.promo-modal-tag {
  display: inline-block;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.promo-modal-header h3 {
  font-size: 1.5rem;
  margin: 0 0 0.35rem;
  color: #111827;
}

.promo-modal-header p {
  color: #4b5563;
  margin: 0;
}

.promo-modal-loading {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #6b7280;
  font-size: 0.95rem;
}

.promo-modal-loading .fa-spinner {
  margin-right: 0.5rem;
}

.promo-modal-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.promo-modal-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.85rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.promo-modal-image {
  width: 100%;
  height: 120px;
  object-fit: contain;
  background: #f9fafb;
  border-radius: 8px;
}

.promo-modal-name {
  font-size: 0.95rem;
  margin: 0;
  color: #111827;
  min-height: 2.4em;
}

.promo-modal-add {
  margin-top: auto;
}

.promo-modal-footer {
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
  text-align: center;
}

.promo-modal-view-all {
  background: none;
  border: none;
  color: #4f46e5;
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
}

.promo-modal-view-all:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .promo-modal-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 540px) {
  .promo-modal-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Visual smoke test (developer)**

```
cd ecommerce-frontend
npm start
```

Open the app in a browser. Click each of the three promo cards in the hero section. Confirm:
- Modal opens with the rebranded title/tag/description.
- Four product cards render (or a loading spinner briefly).
- "Add to Cart" updates the cart count.
- "View all in category" routes to the right category and closes the modal.
- Close via × and overlay click both work.

- [ ] **Step 3: Ready to commit (user runs)**

Suggested message:

```
style(ecommerce-frontend): add styles for curated promo-picks modal
```

---

## Task 7: Final regression check

**Files:** none.

- [ ] **Step 1: Run the full ecommerce-frontend test suite**

```
cd ecommerce-frontend
npm test -- --watch=false
```

Expected: all tests pass.

- [ ] **Step 2: Manual regression in the browser**

With `npm start` running:

- Product grid loads under default category.
- Search works.
- Pagination works.
- Category nav (sidebar) works.
- Product detail modal still opens on card click.
- VIP banner shows when logged in; VIP pricing displays.
- Sponsored mid-page strip still renders.
- Deal of the Day section still shows a product, with the countdown timer running.
- Re-loading the app on the same day shows the same Deal of the Day product.
- Changing the system date and reloading shows a different product (optional check).

- [ ] **Step 3: Ready to commit (user runs)**

No code changes — this task is just a verification gate. If everything is green, the feature is ready.

---

## Out of Scope (deferred)

- Backend changes (`findBySku`, `findBySkuIn`, `/api/promos`).
- Persisting promo definitions in the database.
- Real cart-side promo discounts.
- Promo conversion analytics.
- Refactoring promo logic into a reusable `PromoModalComponent` / `PromoService`.
