import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobService } from '../../services/job.service';
import { Job, JobRequest, TopCandidateMatch } from '../../models/ats.models';

interface EmployerGroup {
  employer: string;
  jobs: Job[];
  collapsed: boolean;
}

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.css'
})
export class JobsComponent implements OnInit {
  jobs: Job[] = [];
  employerGroups: EmployerGroup[] = [];
  showForm = false;
  editingId: number | null = null;
  form: JobRequest = this.emptyForm();

  expandedJobId: number | null = null;
  topMatches: TopCandidateMatch[] = [];
  loadingMatches = false;
  selectedJob: Job | null = null;
  jobsPage = 1;
  readonly jobsPageSize = 5;
  showOpenOnly = false;

  constructor(private readonly jobService: JobService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.jobService.getAll().subscribe({
      next: (jobs) => {
        this.jobs = jobs;
        this.rebuildGroups();
        this.cdr.detectChanges();
      }
    });
  }

  private rebuildGroups(): void {
    const map = new Map<string, Job[]>();
    for (const job of this.jobs) {
      const existing = map.get(job.employer);
      if (existing) {
        existing.push(job);
      } else {
        map.set(job.employer, [job]);
      }
    }
    // Preserve collapsed state for groups that already exist
    const prevCollapsed = new Map(this.employerGroups.map(g => [g.employer, g.collapsed]));
    this.employerGroups = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([employer, jobs]) => ({
        employer,
        jobs,
        collapsed: prevCollapsed.get(employer) ?? false
      }));
  }

  saveJob(): void {
    const obs = this.editingId
      ? this.jobService.update(this.editingId, this.form)
      : this.jobService.create(this.form);

    obs.subscribe({
      next: () => {
        this.loadJobs();
        this.showForm = false;
        this.editingId = null;
        this.form = this.emptyForm();
      }
    });
  }

  editJob(job: Job): void {
    this.editingId = job.id;
    this.form = {
      employer: job.employer,
      title: job.title,
      department: job.department,
      location: job.location,
      description: job.description,
      requiredSkills: job.requiredSkills ?? '',
      address: job.address ?? '',
      latitude: job.latitude ?? null,
      longitude: job.longitude ?? null,
      status: job.status,
      employmentType: job.employmentType
    };
    this.showForm = true;
  }

  deleteJob(id: number): void {
    if (confirm('Delete this job and all its candidates?')) {
      this.jobService.delete(id).subscribe({
        next: () => this.loadJobs()
      });
    }
  }

  toggleTopMatches(jobId: number): void {
    if (this.expandedJobId === jobId) {
      this.expandedJobId = null;
      this.topMatches = [];
      return;
    }
    this.expandedJobId = jobId;
    this.topMatches = [];
    this.loadingMatches = true;
    this.cdr.detectChanges();
    this.jobService.getTopCandidates(jobId).subscribe({
      next: (matches) => {
        this.topMatches = matches;
        this.loadingMatches = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingMatches = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private emptyForm(): JobRequest {
    return { employer: '', title: '', department: '', location: '', description: '', requiredSkills: '', address: '', latitude: null, longitude: null, status: 'OPEN', employmentType: 'FULL_TIME' };
  }

  get openJobCount(): number {
    return this.jobs.filter(j => j.status === 'OPEN').length;
  }

  toggleOpenOnly(): void {
    this.showOpenOnly = !this.showOpenOnly;
    this.jobsPage = 1;
    this.cdr.detectChanges();
  }

  get pagedGroups(): EmployerGroup[] {
    const source = this.showOpenOnly
      ? this.employerGroups.filter(g => g.jobs.some(j => j.status === 'OPEN'))
      : this.employerGroups;
    const start = (this.jobsPage - 1) * this.jobsPageSize;
    return source.slice(start, start + this.jobsPageSize);
  }

  displayedJobs(group: EmployerGroup): Job[] {
    return this.showOpenOnly ? group.jobs.filter(j => j.status === 'OPEN') : group.jobs;
  }

  private get filteredGroupCount(): number {
    if (!this.showOpenOnly) return this.employerGroups.length;
    return this.employerGroups.filter(g => g.jobs.some(j => j.status === 'OPEN')).length;
  }

  get jobsTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredGroupCount / this.jobsPageSize));
  }

  get jobsPageNumbers(): (number | string)[] {
    const total = this.jobsTotalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const cur = this.jobsPage;
    const pages: (number | string)[] = [1];
    if (cur > 3) pages.push('...');
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
    if (cur < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  goToJobsPage(n: number | string): void {
    this.jobsPage = typeof n === 'string' ? parseInt(n, 10) : n;
    this.cdr.detectChanges();
  }
  prevJobsPage(): void { if (this.jobsPage > 1) this.goToJobsPage(this.jobsPage - 1); }
  nextJobsPage(): void { if (this.jobsPage < this.jobsTotalPages) this.goToJobsPage(this.jobsPage + 1); }

  openJobDetail(job: Job): void {
    this.selectedJob = job;
  }

  closeJobDetail(): void {
    this.selectedJob = null;
  }

  parseSkills(skills: string): string[] {
    if (!skills) return [];
    return skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }
}
