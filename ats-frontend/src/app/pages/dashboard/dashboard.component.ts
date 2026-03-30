import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardStats, STAGE_LABELS, STAGE_COLORS, PipelineStage } from '../../models/ats.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
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
