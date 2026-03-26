import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login-status',
  templateUrl: './login-status.html',
  styleUrl: './login-status.css',
  imports: [RouterLink]
})
export class LoginStatusComponent {
  authService = inject(AuthService);

  logout() {
    this.authService.logout();
  }
}
