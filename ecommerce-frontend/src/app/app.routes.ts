import { Routes } from '@angular/router';
import { ProductListComponent } from './components/product-list/product-list';
import { CartDetailsComponent } from './components/cart-details/cart-details';
import { CheckoutComponent } from './components/checkout/checkout';
import { LoginComponent } from './components/login/login';
import { OrderHistoryComponent } from './components/order-history/order-history';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'order-history', component: OrderHistoryComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'cart-details', component: CartDetailsComponent },
  { path: 'search/:keyword', component: ProductListComponent },
  { path: 'category/:id', component: ProductListComponent },
  { path: 'category', component: ProductListComponent },
  { path: 'products', component: ProductListComponent },
  { path: '', redirectTo: '/products', pathMatch: 'full' },
  { path: '**', redirectTo: '/products', pathMatch: 'full' }
];

