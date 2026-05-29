import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { ROLE_LABELS } from '../models/auth.model';

interface NavItem {
  label: string;
  link: string;
  icon: string;
  exact?: boolean;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css'
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly user = this.auth.currentUser;
  readonly userMenuOpen = signal(false);
  readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    return role ? ROLE_LABELS[role] : '';
  });
  readonly userInitials = computed(() => {
    const fullName = this.user()?.fullName ?? '';
    return fullName.split(/\s+/).filter(Boolean).map(p => p[0]?.toUpperCase() ?? '').join('').slice(0, 2);
  });

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', link: '/', icon: '📊', exact: true },
    { label: 'Jobs', link: '/jobs', icon: '💼' },
    { label: 'Talent', link: '/talent', icon: '👥' },
    { label: 'Tasks', link: '/tasks', icon: '✓' },
    { label: 'Users', link: '/users', icon: '⚙', adminOnly: true }
  ];

  visibleNav = computed(() => this.navItems.filter(item => !item.adminOnly || this.auth.isAdmin()));

  toggleUserMenu(): void {
    this.userMenuOpen.update(open => !open);
  }

  signOut(): void {
    this.userMenuOpen.set(false);
    this.auth.logout().subscribe({
      next: () => {
        this.toast.info('Signed out');
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }
}
