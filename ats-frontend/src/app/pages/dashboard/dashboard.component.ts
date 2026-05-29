import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import {
  DashboardStats, STAGE_LABELS as STAGE_LABEL_MAP, STAGE_COLORS as STAGE_COLOR_MAP, PipelineStage,
  ACTIVITY_ICONS as ACTIVITY_ICON_MAP, PRIORITY_COLORS as PRIORITY_COLOR_MAP, PRIORITY_LABELS as PRIORITY_LABEL_MAP
} from '../../models/ats.models';

interface EmployerSlice {
  employer: string;
  count: number;
  percentage: number;
  color: string;
  offset: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  readonly stats = signal<DashboardStats | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);

  readonly stageEntries = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return Object.entries(s.candidatesByStage).map(([stage, count]) => ({
      stage: stage as PipelineStage,
      count,
      label: STAGE_LABEL_MAP[stage as PipelineStage] ?? stage,
      color: STAGE_COLOR_MAP[stage as PipelineStage] ?? '#6366f1'
    }));
  });

  readonly maxStageCount = computed(() => Math.max(1, ...this.stageEntries().map(e => e.count)));

  readonly employerSlices = computed<EmployerSlice[]>(() => {
    const s = this.stats();
    if (!s) return [];
    const entries = Object.entries(s.jobsByEmployer).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    let accumulated = 0;
    const palette = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7', '#f97316', '#64748b'];
    return entries.map(([employer, count], i) => {
      const percentage = total > 0 ? (count / total) * 100 : 0;
      const offset = 25 - accumulated;
      accumulated += percentage;
      return { employer, count, percentage, color: palette[i % palette.length], offset };
    });
  });

  activityIcon(type: import('../../models/activity.model').ActivityType): string { return ACTIVITY_ICON_MAP[type]; }
  priorityColor(p: import('../../models/task.model').TaskPriority): string { return PRIORITY_COLOR_MAP[p]; }
  priorityLabel(p: import('../../models/task.model').TaskPriority): string { return PRIORITY_LABEL_MAP[p]; }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.dashboardService.getStats().subscribe({
      next: stats => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load dashboard data. Please try again.');
        this.loading.set(false);
      }
    });
  }

  relativeTime(iso: string | null): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.round(diff / 60_000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.round(hr / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }

  dueLabel(iso: string | null): { text: string; tone: 'past' | 'today' | 'future' } {
    if (!iso) return { text: 'No due date', tone: 'future' };
    const due = new Date(iso);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const sameDay = due.toDateString() === now.toDateString();
    if (diffMs < 0 && !sameDay) return { text: `Overdue · ${due.toLocaleDateString()}`, tone: 'past' };
    if (sameDay) return { text: `Today · ${due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, tone: 'today' };
    return { text: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), tone: 'future' };
  }
}
