import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-status',
  templateUrl: './login-status.component.html',
  styleUrl: './login-status.component.css',
  imports: [RouterLink]
})
export class LoginStatusComponent {
  authService = inject(AuthService);

  logout() {
    this.authService.logout();
  }
}
