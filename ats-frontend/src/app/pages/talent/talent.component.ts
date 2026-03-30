import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { CandidateService } from '../../services/candidate.service';
import { JobService } from '../../services/job.service';
import {
  Candidate, CandidateRequest, Job, PipelineStage,
  PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS
} from '../../models/ats.models';

@Component({
  selector: 'app-talent',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './talent.component.html',
  styleUrl: './talent.component.css'
})
export class TalentComponent implements OnInit, OnDestroy {
  candidates: Candidate[] = [];
  jobs: Job[] = [];
  loading = false;
  totalCount = 0;

  showAddModal = false;
  showUploadModal = false;
  uploadFile: File | null = null;
  uploading = false;
  uploadError: string | null = null;
  addForm: Partial<CandidateRequest> = {};
  editingCandidate: Candidate | null = null;
  editForm: Partial<CandidateRequest> = {};
  selectedCandidate: Candidate | null = null;

  page = 1;
  readonly pageSize = 12;

  filters = {
    name: '',
    skills: '',
    stage: '' as PipelineStage | '',
    jobId: null as number | null
  };

  allStages: PipelineStage[] = PIPELINE_STAGES;

  private readonly nameSubject = new Subject<string>();
  private readonly skillsSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly candidateService: CandidateService,
    private readonly jobService: JobService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.jobService.getAll().subscribe({ next: jobs => { this.jobs = jobs; this.cdr.detectChanges(); } });

    // Debounce text inputs
    this.nameSubject.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.runSearch());
    this.skillsSubject.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.runSearch());

    this.runSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onNameChange(value: string): void { this.nameSubject.next(value); }
  onSkillsChange(value: string): void { this.skillsSubject.next(value); }

  runSearch(): void {
    this.loading = true;
    this.cdr.detectChanges();
    this.candidateService.search({
      name: this.filters.name || undefined,
      skills: this.filters.skills || undefined,
      stage: this.filters.stage || undefined,
      jobId: this.filters.jobId ?? undefined
    }).subscribe({
      next: (results) => {
        this.candidates = results;
        this.page = 1;
        if (!this.hasActiveFilter()) this.totalCount = results.length;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  resetFilters(): void {
    this.filters = { name: '', skills: '', stage: '', jobId: null };
    this.runSearch();
  }

  hasActiveFilter(): boolean {
    return !!(this.filters.name || this.filters.skills || this.filters.stage || this.filters.jobId);
  }

  clearField(field: 'name' | 'skills'): void {
    this.filters[field] = '';
    this.runSearch();
  }

  filterBySkill(skill: string): void {
    const current = this.filters.skills ? this.filters.skills.split(',').map(s => s.trim()) : [];
    const lowerSkill = skill.toLowerCase();
    const exists = current.some(s => s.toLowerCase() === lowerSkill);
    if (exists) {
      this.filters.skills = current.filter(s => s.toLowerCase() !== lowerSkill).join(', ');
    } else {
      this.filters.skills = [...current, skill].join(', ');
    }
    this.runSearch();
  }

  isSkillMatch(skill: string): boolean {
    if (!this.filters.skills) return false;
    return this.filters.skills.split(',').map(s => s.trim().toLowerCase()).includes(skill.toLowerCase());
  }

  parseSkills(skills: string): string[] {
    if (!skills) return [];
    return skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  stageLabel(stage: PipelineStage): string {
    return STAGE_LABELS[stage] ?? stage;
  }

  stageColor(stage: PipelineStage): string {
    return STAGE_COLORS[stage] ?? '#888';
  }

  stageBg(stage: PipelineStage): string {
    const hex = STAGE_COLORS[stage] ?? '#888';
    return hex + '22';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  openAdd(): void {
    this.addForm = { stage: 'APPLIED' };
    this.showAddModal = true;
  }

  closeAdd(): void {
    this.showAddModal = false;
    this.addForm = {};
  }

  saveAdd(): void {
    const req: CandidateRequest = {
      firstName: this.addForm.firstName ?? '',
      lastName: this.addForm.lastName ?? '',
      email: this.addForm.email ?? '',
      phone: this.addForm.phone ?? '',
      resumeUrl: '',
      notes: this.addForm.notes ?? '',
      skills: this.addForm.skills ?? '',
      address: this.addForm.address ?? '',
      latitude: this.addForm.latitude ?? null,
      longitude: this.addForm.longitude ?? null,
      lastAssignmentDays: this.addForm.lastAssignmentDays ?? 0,
      stage: this.addForm.stage ?? 'APPLIED',
      jobId: this.addForm.jobId!
    };
    this.candidateService.create(req).subscribe(() => {
      this.closeAdd();
      this.runSearch();
    });
  }

  openEdit(candidate: Candidate): void {
    this.editingCandidate = candidate;
    this.editForm = {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      resumeUrl: candidate.resumeUrl,
      notes: candidate.notes,
      skills: candidate.skills,
      address: candidate.address ?? '',
      latitude: candidate.latitude ?? null,
      longitude: candidate.longitude ?? null,
      lastAssignmentDays: candidate.lastAssignmentDays ?? 0,
      stage: candidate.stage,
      jobId: candidate.jobId
    };
  }

  closeEdit(): void {
    this.editingCandidate = null;
    this.editForm = {};
  }

  saveEdit(): void {
    if (!this.editingCandidate) return;
    const req: CandidateRequest = {
      firstName: this.editForm.firstName ?? '',
      lastName: this.editForm.lastName ?? '',
      email: this.editForm.email ?? '',
      phone: this.editForm.phone ?? '',
      resumeUrl: this.editForm.resumeUrl ?? '',
      notes: this.editForm.notes ?? '',
      skills: this.editForm.skills ?? '',
      address: this.editForm.address ?? '',
      latitude: this.editForm.latitude ?? null,
      longitude: this.editForm.longitude ?? null,
      lastAssignmentDays: this.editForm.lastAssignmentDays ?? 0,
      stage: this.editForm.stage ?? 'APPLIED',
      jobId: this.editForm.jobId ?? this.editingCandidate.jobId
    };
    this.candidateService.update(this.editingCandidate.id, req).subscribe(() => {
      this.closeEdit();
      this.runSearch();
    });
  }

  deleteCandidate(id: number): void {
    if (confirm('Delete this candidate from the talent pool? This cannot be undone.')) {
      this.candidateService.delete(id).subscribe(() => this.runSearch());
    }
  }

  openUpload(): void {
    this.uploadFile = null;
    this.uploadError = null;
    this.showUploadModal = true;
  }

  closeUpload(): void {
    if (this.uploading) return;
    this.showUploadModal = false;
    this.uploadFile = null;
    this.uploadError = null;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFile = input.files?.[0] ?? null;
    this.uploadError = null;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.uploadFile = event.dataTransfer?.files[0] ?? null;
    this.uploadError = null;
  }

  submitUpload(): void {
    if (!this.uploadFile) return;
    this.uploading = true;
    this.uploadError = null;
    this.cdr.detectChanges();
    this.candidateService.uploadResume(this.uploadFile).subscribe({
      next: () => {
        this.uploading = false;
        this.showUploadModal = false;
        this.uploadFile = null;
        this.runSearch();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.uploading = false;
        this.uploadError = err?.error?.error ?? 'Upload failed. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  openCandidateDetail(candidate: Candidate): void {
    this.selectedCandidate = candidate;
  }

  closeCandidateDetail(): void {
    this.selectedCandidate = null;
  }

  get pagedCandidates(): Candidate[] {
    const start = (this.page - 1) * this.pageSize;
    return this.candidates.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.candidates.length / this.pageSize));
  }

  get pageNumbers(): (number | string)[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const cur = this.page;
    const pages: (number | string)[] = [1];
    if (cur > 3) pages.push('...');
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
    if (cur < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  goToPage(n: number | string): void {
    this.page = typeof n === 'string' ? parseInt(n, 10) : n;
    this.cdr.detectChanges();
  }
  prevPage(): void { if (this.page > 1) this.goToPage(this.page - 1); }
  nextPage(): void { if (this.page < this.totalPages) this.goToPage(this.page + 1); }
}
