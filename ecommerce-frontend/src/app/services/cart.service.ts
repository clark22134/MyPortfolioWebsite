import { BehaviorSubject } from 'rxjs';
import { CartItem } from './../common/cart-item.model';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface CartItemDto {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {

  cartItems: CartItem[] = [];
  totalPrice: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  totalQuantity: BehaviorSubject<number> = new BehaviorSubject<number>(0);

  storage: Storage = localStorage;
  private currentUserEmail: string | null = null;
  private readonly http = inject(HttpClient);
  private readonly cartApiUrl = '/api/cart';

  constructor() {
    // Restore user email from storage to build the correct cart key
    const stored = this.storage.getItem('authUser');
    if (stored) {
      try {
        this.currentUserEmail = JSON.parse(stored).email ?? null;
      } catch {
        this.currentUserEmail = null;
      }
    }

    const data = this.storage.getItem(this.cartStorageKey);
    if (data) {
      this.cartItems = JSON.parse(data);
      this.computeCartTotals();
    }
  }

  private get cartStorageKey(): string {
    return this.currentUserEmail ? `cartItems_${this.currentUserEmail}` : 'cartItems_guest';
  }

  private get isLoggedIn(): boolean {
    return this.currentUserEmail !== null;
  }

  /**
   * Called on login: persist current (guest) cart, then load the logged-in user's cart
   * from the server. Merges any guest items into the server cart.
   */
  onLogin(email: string): void {
    // Capture guest cart items before switching
    const guestItems = [...this.cartItems];
    this.persistCartItems();

    // Switch to the logged-in user's key
    this.currentUserEmail = email;

    // Fetch cart from server and merge guest items
    this.http.get<CartItemDto[]>(this.cartApiUrl, { withCredentials: true }).subscribe({
      next: (serverItems) => {
        const serverCart = serverItems.map(dto => this.dtoToCartItem(dto));
        this.cartItems = this.mergeCartItems(serverCart, guestItems);
        this.computeCartTotals();
        this.persistCartItems();
        this.syncToServer();
      },
      error: () => {
        // Server unreachable — fall back to localStorage
        const data = this.storage.getItem(this.cartStorageKey);
        const localItems: CartItem[] = data ? JSON.parse(data) : [];
        this.cartItems = this.mergeCartItems(localItems, guestItems);
        this.computeCartTotals();
        this.persistCartItems();
      }
    });
  }

  /**
   * Called on logout: save user's cart to server, then switch to guest cart.
   */
  onLogout(): void {
    // Save the current user's cart to server before switching
    this.syncToServer();
    this.persistCartItems();

    // Switch to guest cart
    this.currentUserEmail = null;
    const data = this.storage.getItem(this.cartStorageKey);
    this.cartItems = data ? JSON.parse(data) : [];
    this.computeCartTotals();
  }

  addToCart(theCartItem: CartItem) {
    const existing = this.cartItems.find(item => item.id === theCartItem.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.cartItems.push(theCartItem);
    }

    this.computeCartTotals();
    this.persistCartItems();
    this.syncToServer();
  }

  persistCartItems() {
    this.storage.setItem(this.cartStorageKey, JSON.stringify(this.cartItems));
  }

  computeCartTotals() {
    let totalPriceValue = 0;
    let totalQuantityValue = 0;

    for (const item of this.cartItems) {
      totalPriceValue += item.unitPrice * item.quantity;
      totalQuantityValue += item.quantity;
    }

    this.totalPrice.next(totalPriceValue);
    this.totalQuantity.next(totalQuantityValue);
  }

  decrementQuantity(theCartItem: CartItem) {
    theCartItem.quantity--;

    if (theCartItem.quantity === 0) {
      this.remove(theCartItem);
    } else {
      this.computeCartTotals();
      this.persistCartItems();
      this.syncToServer();
    }
  }

  remove(theCartItem: CartItem) {
    const itemIndex = this.cartItems.findIndex(item => item.id === theCartItem.id);

    if (itemIndex > -1) {
      this.cartItems.splice(itemIndex, 1);
      this.computeCartTotals();
      this.persistCartItems();
      this.syncToServer();
    }
  }

  clearCart(): void {
    this.cartItems = [];
    this.totalPrice.next(0);
    this.totalQuantity.next(0);
    this.persistCartItems();
    this.syncToServer();
  }

  /**
    * Pushes the current cart to the server. Only fires when the user is logged in.
    */
  private syncToServer(): void {
    if (!this.isLoggedIn) {
      return;
    }
    const dtos: CartItemDto[] = this.cartItems.map(item => ({
      productId: item.id,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
    }));
    this.http.put<CartItemDto[]>(this.cartApiUrl, dtos, { withCredentials: true }).subscribe();
  }

  private dtoToCartItem(dto: CartItemDto): CartItem {
    const item = new CartItem({
      id: dto.productId,
      name: dto.name,
      unitPrice: dto.unitPrice,
      imageUrl: dto.imageUrl,
    } as any);
    item.quantity = dto.quantity;
    return item;
  }

  /**
   * Merges two cart item arrays. Items from `additional` are added into `base`;
   * if the same product exists in both, quantities are summed.
   */
  private mergeCartItems(base: CartItem[], additional: CartItem[]): CartItem[] {
    const merged = [...base];
    for (const item of additional) {
      const existing = merged.find(m => m.id === item.id);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        merged.push(item);
      }
    }
    return merged;
  }
}
