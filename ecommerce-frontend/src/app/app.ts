import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { ProductCategoryMenu } from './components/product-category-menu/product-category-menu';
import { SearchComponent } from './components/search/search';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CartStatusComponent } from './components/cart-status/cart-status';
import { LoginStatusComponent } from './components/login-status/login-status';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, ProductCategoryMenu, SearchComponent, NgbModule, CartStatusComponent, LoginStatusComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('angular-ecommerce');
  mobileMenuOpen = signal(false);
  showVideoIntro = signal(true);

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  dismissVideo() {
    this.showVideoIntro.set(false);
  }

  onVideoEnded() {
    this.showVideoIntro.set(false);
  }
}


