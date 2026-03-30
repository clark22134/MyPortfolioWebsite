import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-login-status',
  templateUrl: './login-status.component.html',
  styleUrl: './login-status.component.css',
  imports: [RouterLink]
})
export class LoginStatusComponent {
  authService = inject(AuthService);
  private cartService = inject(CartService);
  private router = inject(Router);

  logout() {
    this.cartService.onLogout();
    this.authService.logout();
  }

  goToLogin() {
    // Force re-navigation even if already on /login (e.g. when viewing registration form)
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/login']);
    });
  }
}
