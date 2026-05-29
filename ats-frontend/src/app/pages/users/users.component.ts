import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { CreateUserRequest, ROLE_LABELS as ROLE_LABEL_MAP, Role, UserInfo } from '../../models/auth.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);

  readonly users = signal<UserInfo[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly newUser = signal<CreateUserRequest>({
    username: '', password: '', email: '', fullName: '', role: 'RECRUITER'
  });

  readonly roles: Role[] = ['ADMIN', 'RECRUITER', 'HIRING_MANAGER'];
  roleLabel(role: Role): string { return ROLE_LABEL_MAP[role]; }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.userService.list().subscribe({
      next: users => { this.users.set(users); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Could not load users'); }
    });
  }

  toggleCreate(): void {
    this.creating.update(v => !v);
    if (!this.creating()) {
      this.newUser.set({ username: '', password: '', email: '', fullName: '', role: 'RECRUITER' });
    }
  }

  update<K extends keyof CreateUserRequest>(key: K, value: CreateUserRequest[K]): void {
    this.newUser.update(u => ({ ...u, [key]: value }));
  }

  save(): void {
    const draft = this.newUser();
    if (!draft.username || !draft.password || !draft.email || !draft.fullName) {
      this.toast.warning('All fields are required');
      return;
    }
    this.userService.create(draft).subscribe({
      next: created => {
        this.users.update(list => [...list, created].sort((a, b) => a.username.localeCompare(b.username)));
        this.toast.success(`User ${created.username} created`);
        this.creating.set(false);
        this.newUser.set({ username: '', password: '', email: '', fullName: '', role: 'RECRUITER' });
      },
      error: err => this.toast.error('Could not create user', err?.error?.error ?? '')
    });
  }

  toggleEnabled(user: UserInfo): void {
    this.userService.update(user.id, {
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      enabled: !user.enabled
    }).subscribe({
      next: updated => {
        this.users.update(list => list.map(u => u.id === user.id ? updated : u));
        this.toast.success(updated.enabled ? 'User enabled' : 'User disabled');
      },
      error: () => this.toast.error('Could not update user')
    });
  }

  changeRole(user: UserInfo, role: Role): void {
    if (user.role === role) return;
    this.userService.update(user.id, {
      email: user.email,
      fullName: user.fullName,
      role,
      enabled: user.enabled
    }).subscribe({
      next: updated => {
        this.users.update(list => list.map(u => u.id === user.id ? updated : u));
        this.toast.success(`Role updated to ${ROLE_LABEL_MAP[role]}`);
      },
      error: () => this.toast.error('Could not update role')
    });
  }

  remove(user: UserInfo): void {
    if (!confirm(`Delete user ${user.username}? They will be signed out immediately.`)) return;
    this.userService.delete(user.id).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u.id !== user.id));
        this.toast.info(`User ${user.username} removed`);
      },
      error: () => this.toast.error('Could not delete user')
    });
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString();
  }
}
