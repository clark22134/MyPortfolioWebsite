# Promo Sections & Deal-of-the-Day Rotation — Design

## Summary

The ecommerce product-list page surfaces three promotional cards
(`Home Office Refresh`, `Limited-Time Electronics`, `Buy More, Save More`)
and a `Deal of the Day` strip. Today, every promo CTA opens the
`AI Code Reviewer Pro` modal because `dealProduct = products()[0]`
and all promo buttons reuse `viewDeal(dealProduct())`.

This work makes each promo do something distinct and on-brand for the
store, and makes Deal of the Day rotate deterministically each day so
it isn't always the first product.

## Scope

- Frontend only (Angular). No Java/DB changes.
- Single component touched in the main flow: `ProductListComponent`
  (with its template, styles, and tests) plus a small addition to
  `ProductService`.

## Decisions (from brainstorming)

1. **Rebrand titles** to fit the actual dev-tooling catalog rather than
   keep generic "home office" copy.
2. **Promo CTAs open a curated-picks modal** (not a category route, not
   the existing single-product modal).
3. **Curated SKU/ID lists are hardcoded in the component**, not
   backend-driven.
4. **Modal content** is a mini product grid (image, name, price, Add to
   Cart) plus a `View all in [category]` footer link.
5. **Pricing inside the modal follows the existing rules** (VIP member
   discount applied if authenticated). No extra promo discount.
6. **Deal of the Day rotates deterministically by date** — same product
   all day for every visitor, different product the next day.

## Architecture

All new state and behavior lives on `ProductListComponent`. A new method
on `ProductService` fetches several products by ID in parallel.

```
ProductListComponent
├── promoHighlights: PromoHighlight[]            (rebranded, with productIds + categoryId)
├── selectedPromo: signal<PromoHighlight | null> (drives new modal)
├── promoProducts: signal<Product[]>             (curated picks for the open promo)
├── promoLoading: signal<boolean>
├── dealPool: signal<Product[]>                  (rotation source, loaded once)
└── dealProduct: computed → pool[dayOfYear % pool.length]

ProductService
└── getProductsByIds(ids: number[]): Observable<Product[]>
    └── forkJoin(ids.map(id => getProduct(id)))   (no backend change)
```

## Component Design

### Promo data model

Replace the existing `PromoHighlight` interface with:

```ts
interface PromoHighlight {
  readonly id: string;
  readonly tag: string;
  readonly title: string;
  readonly description: string;
  readonly cta: string;
  readonly iconClass: string;
  readonly categoryId: number;
  readonly productIds: number[];   // 3-4 curated picks
}
```

`productIds` is used rather than `productSkus` because
`ProductRepository` only exposes `findByCategoryId` and
`findByNameContainingIgnoreCase` — there is no `findBySku` query. Using
IDs lets us reuse the existing `GET /api/products/{id}` endpoint via
`ProductService.getProduct(id)`. Per the seed data
(`refresh-database-with-100-products-updated.sql`) IDs are sequential
1–100, with categories partitioned as: 1–25 AI & Automation, 26–50
Developer Survival Gear, 51–75 Cybersecurity & Spy Tech, 76–100 Future
Tech & Lifestyle.

### Rebranded promo entries

| id | tag | title | description | categoryId | iconClass | cta |
|---|---|---|---|---|---|---|
| `ai-toolkit` | "AI Toolkit Sale" | "AI Code & Ops Essentials" | "Save on AI reviewers, predictive monitors, and natural-language tooling." | 1 | `fa-laptop` | "Shop AI Tools" |
| `dev-survival` | "Limited-Time Drop" | "Developer Survival Picks" | "Top-rated dev gear and productivity essentials at this week's best prices." | 2 | `fa-bolt` | "See the Drop" |
| `spy-bundle` | "Bundle & Save" | "Spy Tech Bundles" | "Stackable discounts on cybersecurity gadgets and surveillance kit." | 3 | `fa-tags` | "Bundle & Save" |

Curated product IDs per promo (chosen for variety across the seed data's
category ranges; the implementer may swap individual IDs if a product
turns out to have a poor image, but should keep the count and category):

- `ai-toolkit` (category 1, IDs 1–25): `[1, 3, 10, 16]`
- `dev-survival` (category 2, IDs 26–50): `[26, 30, 37, 45]`
- `spy-bundle` (category 3, IDs 51–75): `[51, 58, 64, 72]`

### Modal state and lifecycle

New signals:

```ts
selectedPromo  = signal<PromoHighlight | null>(null);
promoProducts  = signal<Product[]>([]);
promoLoading   = signal<boolean>(false);
```

`openPromoModal(promo: PromoHighlight)`:

1. `selectedPromo.set(promo)`
2. `promoProducts.set([])`
3. `promoLoading.set(true)`
4. `document.body.style.overflow = 'hidden'`
5. `productService.getProductsByIds(promo.productIds).subscribe(products => {
       promoProducts.set(products);
       promoLoading.set(false);
   })`

`closePromoModal()`:

1. `selectedPromo.set(null)`
2. `promoProducts.set([])`
3. `document.body.style.overflow = ''`

`viewPromoCategory()`:

1. Read `selectedPromo()?.categoryId`.
2. Close the modal.
3. `router.navigateByUrl('/category/' + id)`.

### Modal template

A new `@if (selectedPromo()) { ... }` block placed after the existing
product-detail modal in `product-list-grid.component.html`. Uses the
existing `.modal-overlay` / `.modal-content` shell for consistency, with
new content classes:

```
.promo-modal-header   → tag pill, title, description, close button
.promo-modal-grid     → mini product cards (image, name, price, Add to Cart)
.promo-modal-card     → individual curated pick
.promo-modal-loading  → skeleton / spinner while promoLoading()
.promo-modal-footer   → "View all in [category] →" link
```

Inside `.promo-modal-card`, pricing markup mirrors the main grid:

- Authenticated users see crossed-out `unitPrice` and the `getMemberPrice`
  value side-by-side, plus the existing VIP badge styling.
- Unauthenticated users see a single `unitPrice`.

`Add to Cart` buttons call the existing `addToCart(product)` — no
behavioral change.

### Deal-of-the-Day rotation

Remove the line:

```ts
readonly dealProduct = computed(() => this.products()[0] ?? null);
```

Add:

```ts
private readonly dealPool = signal<Product[]>([]);

readonly dealProduct = computed(() => {
  const pool = this.dealPool();
  if (pool.length === 0) return null;
  return pool[this.dayOfYear() % pool.length];
});

private dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

private loadDealPool() {
  this.productService
    .getProductListPaginate(1, 24, 1)
    .subscribe(response => {
      this.dealPool.set(response._embedded?.products ?? []);
    });
}
```

`loadDealPool()` is called once from `ngOnInit`, alongside
`startDealCountdown()`. The pool is independent of the category the
user is browsing, so the deal stays consistent across navigation.

The hero "Shop Featured Deal" button and the entire `deal-of-day`
section are already guarded by `@if (dealProduct())` /
`[disabled]="!dealProduct()"`; both naturally degrade if the pool
fails to load.

## ProductService Change

Add one method:

```ts
getProductsByIds(ids: number[]): Observable<Product[]> {
  if (ids.length === 0) return of([]);
  return forkJoin(ids.map(id => this.getProduct(id)));
}
```

`forkJoin` preserves input order, so curated lists render in the order
the designer specified. Errors propagate to the subscriber — the modal
will simply show empty if any underlying request fails. (No retry, no
partial-success handling — out of scope.)

## Template Wiring

In `product-list-grid.component.html`:

- Each `.hero-highlight-card`'s CTA changes from
  `(click)="dealProduct() && viewDeal(dealProduct()!)"` to
  `(click)="openPromoModal(promo)"`. The `[disabled]` is removed
  (curated lists are always present).
- The hero "Shop Featured Deal" button stays on
  `viewDeal(dealProduct()!)` — behavior is unchanged from the template's
  perspective, but the resulting product now rotates daily.
- A new `@if (selectedPromo()) { ... }` modal block is added at the
  bottom of the file.

## Styles

Additions to `product-list.component.css`:

- `.promo-modal-header`, `.promo-modal-grid`, `.promo-modal-card`,
  `.promo-modal-loading`, `.promo-modal-footer`.
- Responsive: 4 cards across on desktop, 2 across on tablet, 1 across
  on mobile.

Existing modal overlay / close button styles are reused.

## Testing

### Unit (Karma/Jasmine)

`product-list.component.spec.ts` adds tests for:

1. `openPromoModal(promo)` sets `selectedPromo`, clears
   `promoProducts`, sets `promoLoading=true`, then on service emit
   populates `promoProducts` and clears `promoLoading`.
2. `closePromoModal()` clears state and unlocks body overflow.
3. `viewPromoCategory()` navigates to `/category/{categoryId}` and
   closes the modal.
4. `dealProduct` returns the same product on two reads within a frozen
   date; returns a different product when `Date.now` is moved to a
   different day-of-year (using Jasmine clock or `jest.useFakeTimers`
   equivalent in the project's setup).
5. `dealProduct` returns `null` when `dealPool` is empty.

`product.service.spec.ts` adds:

6. `getProductsByIds([id1, id2])` issues two `GET /api/products/{id}`
   calls and returns results in input order.
7. `getProductsByIds([])` returns `of([])` without HTTP traffic.

### Manual

- Click each promo card → modal opens with the curated picks for that
  promo (verify titles differ between promos).
- Add a curated pick to cart → cart count updates.
- Click "View all in [category]" → routes to the correct category
  page and modal closes.
- Close via × and via overlay click.
- VIP pricing displays correctly in the modal when logged in.
- Load the app on two different system dates → Deal of the Day shows
  different products.
- Navigate between categories → Deal of the Day stays the same.

### Regression check

- Existing product grid, search, pagination, category navigation,
  product-detail modal, VIP banner, sponsored mid-page strip, and
  countdown timer are unaffected.

## Out of Scope

- Backend changes (new endpoints, new repository queries).
- Persisting promo selections to a database.
- Real cart-side promo discounts.
- Tracking promo conversions / analytics.
- A reusable `PromoModalComponent` (Approach C in brainstorming) —
  worth revisiting if more promos are added later.

## Risks

- **Hardcoded IDs depend on seed-data ordering.** If the seed script
  is replaced or products are re-ordered, the curated lists could
  point at the wrong items. Mitigation: pick IDs from each category's
  known range and document the choice in code comments alongside the
  arrays.
- **`forkJoin` fails fast.** If one curated product is missing, the
  whole modal will be empty. Acceptable for now given the data is
  controlled.
