import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavComponent } from '../nav/nav.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-accessibility-statement',
  standalone: true,
  imports: [CommonModule, RouterModule, NavComponent],
  templateUrl: './accessibility-statement.component.html',
  styleUrl: './accessibility-statement.component.css'
})
export class AccessibilityStatementComponent {
  isAuthenticated = false;

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }
}
