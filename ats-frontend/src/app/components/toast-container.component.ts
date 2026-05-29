import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack" role="status" aria-live="polite">
      @for (toast of toasts(); track toast.id) {
        <div class="toast toast-{{ toast.variant }}" (click)="dismiss(toast.id)">
          <div class="toast-content">
            <div class="toast-title">{{ toast.title }}</div>
            @if (toast.message) {
              <div class="toast-message">{{ toast.message }}</div>
            }
          </div>
          <button type="button" class="toast-close" aria-label="Dismiss" (click)="dismiss(toast.id); $event.stopPropagation()">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast { cursor: pointer; }
    .toast-content { flex: 1; }
    .toast-close {
      background: transparent; border: none; color: var(--text-secondary);
      font-size: 1.3rem; line-height: 1; padding: 0 4px; cursor: pointer;
    }
    .toast-close:hover { color: var(--text-primary); }
  `]
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);
  readonly toasts = computed(() => this.toastService.toasts());

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
