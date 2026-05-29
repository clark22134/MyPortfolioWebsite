import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { JobService } from '../../services/job.service';
import { CandidateService } from '../../services/candidate.service';
import {
  Job, Candidate, CandidateRequest, PipelineStage,
  PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS
} from '../../models/ats.models';
import { seedCandidateEditForm, toCandidateRequest } from '../../util/candidate-form';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DragDropModule],
  templateUrl: './pipeline.component.html',
  styleUrl: './pipeline.component.css'
})
export class PipelineComponent implements OnInit {
  job: Job | null = null;
  candidates: Candidate[] = [];
  editingCandidate: Candidate | null = null;
  editForm: Partial<CandidateRequest> = {};

  activeStages: PipelineStage[] = PIPELINE_STAGES.filter(s => s !== 'REJECTED');
  allStages: PipelineStage[] = PIPELINE_STAGES;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  get canWrite(): boolean { return this.auth.canWrite(); }

  openDetail(id: number): void {
    this.router.navigate(['/candidates', id]);
  }

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

  openEdit(candidate: Candidate): void {
    this.editingCandidate = candidate;
    this.editForm = seedCandidateEditForm(candidate);
  }

  closeEdit(): void {
    this.editingCandidate = null;
    this.editForm = {};
  }

  saveEdit(): void {
    if (!this.editingCandidate) return;
    const req: CandidateRequest = toCandidateRequest(this.editForm, this.editingCandidate.jobId);
    // Pipeline doesn't allow re-assigning the job, so pin it back to the original.
    req.jobId = this.editingCandidate.jobId;
    this.candidateService.update(this.editingCandidate.id, req).subscribe(() => {
      this.closeEdit();
      this.loadCandidates();
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

  parseSkills(skills: string): string[] {
    if (!skills) return [];
    return skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }
}
