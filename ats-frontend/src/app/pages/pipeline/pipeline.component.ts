import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { JobService } from '../../services/job.service';
import { CandidateService } from '../../services/candidate.service';
import {
  Job, Candidate, CandidateRequest, PipelineStage,
  PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS
} from '../../models/ats.models';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DragDropModule],
  template: `
    <div class="pipeline-page">
      <div class="page-header">
        <div>
          <a routerLink="/jobs" class="back-link">← Back to Jobs</a>
          @if (job) {
            <h1>{{ job.title }}</h1>
            <p class="subtitle">{{ job.department }} · {{ job.location }}</p>
          }
        </div>
        <button class="btn-primary" (click)="showAddForm = !showAddForm">
          {{ showAddForm ? 'Cancel' : '+ Add Candidate' }}
        </button>
      </div>

      @if (showAddForm) {
        <form class="candidate-form" (ngSubmit)="addCandidate()">
          <div class="form-grid">
            <div class="form-group">
              <label for="firstName">First Name</label>
              <input id="firstName" [(ngModel)]="candidateForm.firstName" name="firstName" required>
            </div>
            <div class="form-group">
              <label for="lastName">Last Name</label>
              <input id="lastName" [(ngModel)]="candidateForm.lastName" name="lastName" required>
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" [(ngModel)]="candidateForm.email" name="email" type="email" required>
            </div>
            <div class="form-group">
              <label for="phone">Phone</label>
              <input id="phone" [(ngModel)]="candidateForm.phone" name="phone">
            </div>
          </div>
          <div class="form-group full-width">
            <label for="notes">Notes</label>
            <textarea id="notes" [(ngModel)]="candidateForm.notes" name="notes" rows="2"></textarea>
          </div>
          <button type="submit" class="btn-primary">Add Candidate</button>
        </form>
      }

      <div class="kanban-board" role="region" aria-label="Candidate pipeline board">
        @for (stage of activeStages; track stage) {
          <div class="kanban-column">
            <div class="column-header" [style.border-bottom-color]="getColor(stage)">
              <span class="column-title">{{ getLabel(stage) }}</span>
              <span class="column-count">{{ getCandidatesForStage(stage).length }}</span>
            </div>
            <div
              class="column-body"
              cdkDropList
              [cdkDropListData]="stage"
              [id]="stage"
              [cdkDropListConnectedTo]="activeStages"
              (cdkDropListDropped)="onDrop($event)">
              @for (candidate of getCandidatesForStage(stage); track candidate.id) {
                <div class="candidate-card" cdkDrag [cdkDragData]="candidate">
                  <div class="candidate-name">{{ candidate.firstName }} {{ candidate.lastName }}</div>
                  <div class="candidate-email">{{ candidate.email }}</div>
                  @if (candidate.phone) {
                    <div class="candidate-phone">{{ candidate.phone }}</div>
                  }
                  @if (candidate.notes) {
                    <div class="candidate-notes">{{ candidate.notes }}</div>
                  }
                  <div class="candidate-date">Applied {{ formatDate(candidate.appliedAt) }}</div>
                  <button class="btn-delete" (click)="deleteCandidate(candidate.id)" aria-label="Remove candidate">×</button>
                </div>
              } @empty {
                <div class="empty-column">No candidates</div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .pipeline-page { max-width: 100%; }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }
    .back-link {
      font-size: 0.85rem;
      color: var(--text-secondary);
      display: inline-block;
      margin-bottom: 0.35rem;
    }
    .back-link:hover { color: var(--accent); }
    h1 { font-size: 1.5rem; font-weight: 700; }
    .subtitle { color: var(--text-secondary); font-size: 0.9rem; }

    .btn-primary {
      background: var(--accent);
      color: white;
      border: none;
      padding: 0.6rem 1.25rem;
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.9rem;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .btn-primary:hover { background: var(--accent-hover); }

    .candidate-form {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-group.full-width { margin-bottom: 1rem; }
    label { font-size: 0.85rem; font-weight: 500; color: var(--text-secondary); }
    input, textarea {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.55rem 0.75rem;
      color: var(--text-primary);
      font-size: 0.9rem;
      font-family: inherit;
    }
    input:focus, textarea:focus { outline: none; border-color: var(--accent); }
    textarea { resize: vertical; }

    .kanban-board {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      padding-bottom: 1rem;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x mandatory;
    }

    .kanban-column {
      min-width: 240px;
      max-width: 280px;
      flex: 1;
      flex-shrink: 0;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      display: flex;
      flex-direction: column;
      scroll-snap-align: start;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      .kanban-board { gap: 0.5rem; }
      .kanban-column {
        min-width: 220px;
        max-width: 220px;
      }
    }

    @media (max-width: 480px) {
      .kanban-column {
        min-width: calc(100vw - 3.5rem);
        max-width: calc(100vw - 3.5rem);
      }
      .form-grid { grid-template-columns: 1fr; }
    }

    .column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 3px solid;
    }
    .column-title { font-weight: 600; font-size: 0.85rem; }
    .column-count {
      background: rgba(255,255,255,0.08);
      padding: 0.15rem 0.55rem;
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .column-body {
      padding: 0.5rem;
      min-height: 120px;
      flex: 1;
    }

    .candidate-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      cursor: grab;
      transition: box-shadow 0.15s, border-color 0.15s;
      position: relative;
    }
    .candidate-card:hover { border-color: var(--accent); }
    .candidate-card:active { cursor: grabbing; }

    .cdk-drag-preview {
      background: var(--bg-card);
      border: 1px solid var(--accent);
      border-radius: var(--radius);
      padding: 0.75rem;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }
    .cdk-drag-placeholder {
      background: rgba(99,102,241,0.08);
      border: 2px dashed var(--accent);
      border-radius: var(--radius);
      min-height: 60px;
      margin-bottom: 0.5rem;
    }
    .cdk-drag-animating {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }

    .candidate-name { font-weight: 600; font-size: 0.9rem; margin-bottom: 0.2rem; }
    .candidate-email { font-size: 0.8rem; color: var(--accent); margin-bottom: 0.15rem; }
    .candidate-phone { font-size: 0.78rem; color: var(--text-secondary); }
    .candidate-notes {
      font-size: 0.78rem;
      color: var(--text-secondary);
      margin-top: 0.35rem;
      border-top: 1px solid var(--border);
      padding-top: 0.35rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .candidate-date { font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.35rem; }

    .btn-delete {
      position: absolute;
      top: 0.4rem;
      right: 0.5rem;
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.1rem;
      cursor: pointer;
      line-height: 1;
      padding: 0.15rem;
      border-radius: 4px;
    }
    .btn-delete:hover { color: var(--danger); background: rgba(239,68,68,0.1); }

    .empty-column {
      text-align: center;
      padding: 1.5rem 0.5rem;
      color: var(--text-secondary);
      font-size: 0.82rem;
    }
  `]
})
export class PipelineComponent implements OnInit {
  job: Job | null = null;
  candidates: Candidate[] = [];
  showAddForm = false;
  candidateForm: Partial<CandidateRequest> = {};

  activeStages: PipelineStage[] = PIPELINE_STAGES.filter(s => s !== 'REJECTED');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly jobService: JobService,
    private readonly candidateService: CandidateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const jobId = Number(this.route.snapshot.paramMap.get('id'));
    this.jobService.get(jobId).subscribe({
      next: (job) => {
        this.job = job;
        this.cdr.detectChanges();
      }
    });
    this.loadCandidates(jobId);
  }

  loadCandidates(jobId?: number): void {
    const id = jobId ?? this.job?.id;
    if (!id) return;
    this.candidateService.getByJob(id).subscribe({
      next: (candidates) => {
        this.candidates = candidates;
        this.cdr.detectChanges();
      }
    });
  }

  getCandidatesForStage(stage: PipelineStage): Candidate[] {
    return this.candidates.filter(c => c.stage === stage);
  }

  addCandidate(): void {
    if (!this.job) return;
    const req: CandidateRequest = {
      firstName: this.candidateForm.firstName ?? '',
      lastName: this.candidateForm.lastName ?? '',
      email: this.candidateForm.email ?? '',
      phone: this.candidateForm.phone ?? '',
      resumeUrl: '',
      notes: this.candidateForm.notes ?? '',
      stage: 'APPLIED',
      jobId: this.job.id
    };
    this.candidateService.create(req).subscribe(() => {
      this.loadCandidates();
      this.showAddForm = false;
      this.candidateForm = {};
    });
  }

  onDrop(event: CdkDragDrop<PipelineStage>): void {
    const candidate: Candidate = event.item.data;
    const newStage = event.container.data;
    if (candidate.stage === newStage) return;

    // Optimistic update: reflect the stage change immediately in the local array
    // so the card stays in the new column without waiting for the API round-trip.
    const idx = this.candidates.findIndex(c => c.id === candidate.id);
    if (idx !== -1) {
      this.candidates[idx] = { ...this.candidates[idx], stage: newStage };
      this.candidates = [...this.candidates];
      this.cdr.detectChanges();
    }

    this.candidateService.moveStage(candidate.id, {
      newStage,
      newOrder: event.currentIndex
    }).subscribe({
      next: () => this.loadCandidates()
    });
  }

  deleteCandidate(id: number): void {
    if (confirm('Remove this candidate?')) {
      this.candidateService.delete(id).subscribe(() => this.loadCandidates());
    }
  }

  getLabel(stage: PipelineStage): string {
    return STAGE_LABELS[stage];
  }

  getColor(stage: PipelineStage): string {
    return STAGE_COLORS[stage];
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
