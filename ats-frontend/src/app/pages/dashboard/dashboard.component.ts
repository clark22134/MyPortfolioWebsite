import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardStats, STAGE_LABELS, STAGE_COLORS, PipelineStage } from '../../models/ats.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink],
  template: `
    <div class="dashboard">
      <h1>Dashboard</h1>

      @if (stats) {
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalJobs }}</div>
            <div class="stat-label">Total Jobs</div>
          </div>
          <div class="stat-card accent">
            <div class="stat-value">{{ stats.openJobs }}</div>
            <div class="stat-label">Open Positions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalCandidates }}</div>
            <div class="stat-label">Total Candidates</div>
          </div>
        </div>

        <h2>Pipeline Overview</h2>
        <div class="pipeline-grid">
          @for (entry of stageEntries; track entry.stage) {
            <div class="pipeline-card" [style.border-top-color]="getStageColor(entry.stage)">
              <div class="pipeline-count">{{ entry.count }}</div>
              <div class="pipeline-label">{{ getStageLabel(entry.stage) }}</div>
            </div>
          }
        </div>

        @if (employerChartData.length > 0) {
          <h2>Jobs by Client</h2>
          <div class="employer-chart-card">
            <div class="donut-wrapper">
              <svg viewBox="0 0 42 42" class="donut-svg" aria-hidden="true">
                <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--border)" stroke-width="3.5"/>
                @for (slice of employerChartData; track slice.employer) {
                  <circle
                    cx="21" cy="21" r="15.9155"
                    fill="transparent"
                    [attr.stroke]="slice.color"
                    stroke-width="3.5"
                    [attr.stroke-dasharray]="slice.percentage + ' ' + (100 - slice.percentage)"
                    [attr.stroke-dashoffset]="slice.offset"
                    stroke-linecap="butt"
                  />
                }
                <text x="21" y="19.5" text-anchor="middle" class="donut-total">{{ stats!.totalJobs }}</text>
                <text x="21" y="24.5" text-anchor="middle" class="donut-label">jobs</text>
              </svg>
            </div>
            <div class="employer-legend">
              @for (slice of employerChartData; track slice.employer) {
                <div class="legend-item">
                  <span class="legend-swatch" [style.background]="slice.color"></span>
                  <span class="legend-employer">{{ slice.employer }}</span>
                  <span class="legend-count">{{ slice.count }}</span>
                  <span class="legend-pct">{{ slice.percentage | number:'1.0-0' }}%</span>
                </div>
              }
            </div>
          </div>
        }

        <div class="quick-actions">
          <a routerLink="/jobs" class="action-btn">View All Jobs →</a>
        </div>
      } @else if (error) {
        <div class="error">{{ error }}</div>
      } @else {
        <div class="loading">Loading dashboard...</div>
      }
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1000px; }
    h1 { font-size: 1.75rem; margin-bottom: 1.5rem; font-weight: 700; }
    h2 { font-size: 1.25rem; margin: 2rem 0 1rem; font-weight: 600; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      text-align: center;
    }
    .stat-card.accent { border-color: var(--accent); }
    .stat-value { font-size: 2.5rem; font-weight: 700; }
    .stat-card.accent .stat-value { color: var(--accent); }
    .stat-label { color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem; }

    .pipeline-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.75rem;
    }

    .pipeline-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-top: 3px solid;
      border-radius: var(--radius);
      padding: 1rem;
      text-align: center;
    }
    .pipeline-count { font-size: 1.75rem; font-weight: 700; }
    .pipeline-label { color: var(--text-secondary); font-size: 0.8rem; margin-top: 0.25rem; }

    .quick-actions { margin-top: 2rem; }
    .action-btn {
      display: inline-block;
      background: var(--accent);
      color: white;
      padding: 0.65rem 1.25rem;
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.9rem;
      transition: background 0.15s;
    }
    .action-btn:hover { background: var(--accent-hover); color: white; }

    .employer-chart-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 2rem;
    }
    .donut-wrapper { flex-shrink: 0; width: 150px; height: 150px; }
    .donut-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .donut-total {
      transform: rotate(90deg);
      transform-origin: 21px 21px;
      font-size: 7px;
      font-weight: 700;
      fill: var(--text-primary);
    }
    .donut-label {
      transform: rotate(90deg);
      transform-origin: 21px 21px;
      font-size: 3.5px;
      fill: var(--text-secondary);
    }
    .employer-legend { flex: 1; display: flex; flex-direction: column; gap: 0.6rem; }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.875rem;
    }
    .legend-swatch {
      width: 12px;
      height: 12px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .legend-employer { flex: 1; color: var(--text-primary); }
    .legend-count { font-weight: 600; color: var(--text-primary); }
    .legend-pct { color: var(--text-secondary); font-size: 0.8rem; min-width: 2.5rem; text-align: right; }

    .loading { color: var(--text-secondary); padding: 3rem; text-align: center; }
    .error { color: #ef4444; padding: 3rem; text-align: center; }

    @media (max-width: 480px) {
      h1 { font-size: 1.4rem; }
      .stats-grid { grid-template-columns: 1fr 1fr; gap: 0.75rem; }
      .stat-card { padding: 1rem; }
      .stat-value { font-size: 2rem; }
      .pipeline-grid { grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
      .pipeline-card { padding: 0.75rem; }
      .pipeline-count { font-size: 1.4rem; }
      .employer-chart-card { flex-direction: column; gap: 1rem; }
      .donut-wrapper { width: 120px; height: 120px; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  stageEntries: { stage: PipelineStage; count: number }[] = [];
  employerChartData: { employer: string; count: number; percentage: number; color: string; offset: number }[] = [];
  error: string | null = null;

  private readonly CHART_COLORS = [
    '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
    '#3b82f6', '#ec4899', '#14b8a6', '#a855f7', '#f97316', '#64748b'
  ];

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.dashboardService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.stageEntries = Object.entries(stats.candidatesByStage).map(([stage, count]) => ({
          stage: stage as PipelineStage,
          count
        }));
        const entries = Object.entries(stats.jobsByEmployer ?? {})
          .sort((a, b) => b[1] - a[1]);
        const total = entries.reduce((sum, [, c]) => sum + c, 0);
        let accumulated = 0;
        this.employerChartData = entries.map(([employer, count], i) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          const offset = 25 - accumulated;
          accumulated += percentage;
          return { employer, count, percentage, color: this.CHART_COLORS[i % this.CHART_COLORS.length], offset };
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load dashboard stats:', err);
        this.error = 'Failed to load dashboard data. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  getStageLabel(stage: PipelineStage): string {
    return STAGE_LABELS[stage] ?? stage;
  }

  getStageColor(stage: PipelineStage): string {
    return STAGE_COLORS[stage] ?? '#6366f1';
  }
}
