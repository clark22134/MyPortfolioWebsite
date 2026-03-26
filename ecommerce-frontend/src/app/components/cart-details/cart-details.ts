import { Component, inject, OnInit } from '@angular/core';
import { CartItem } from '../../common/cart-item';
import { CartService } from '../../services/cart';
import { AuthService } from '../../services/auth';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cart-details',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './cart-details.html',
  styleUrl: './cart-details.css',
})
export class CartDetailsComponent implements OnInit {

  cartItems: CartItem[] = [];
  totalPrice: number = 0.00;
  totalQuantity: number = 0;
  authService = inject(AuthService);

  ngOnInit(): void {
    // Initialize cart items, total price, and total quantity
    this.listCartDetails();
  }

  constructor(private cartService: CartService) {}

  listCartDetails() {
    // get a handle to the cart items
    this.cartItems = this.cartService.cartItems;

    // subscribe to the cart totalPrice
    this.cartService.totalPrice.subscribe(data =>
      this.totalPrice = data);

    // subscribe to the cart totalQuantity
    this.cartService.totalQuantity.subscribe(data =>
      this.totalQuantity = data);

    // compute cart total price and total quantity
    this.cartService.computeCartTotals();
  }

  incrementQuantity(theCartItem: CartItem) {
    this.cartService.addToCart(theCartItem);
  }

  decrementQuantity(theCartItem: CartItem) {
    this.cartService.decrementQuantity(theCartItem);
  }

  remove(theCartItem: CartItem) {
    this.cartService.remove(theCartItem);
  }


}
