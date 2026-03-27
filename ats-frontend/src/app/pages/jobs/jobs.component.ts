import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobService } from '../../services/job.service';
import { Job, JobRequest } from '../../models/ats.models';

interface EmployerGroup {
  employer: string;
  jobs: Job[];
  collapsed: boolean;
}

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="jobs-page">
      <div class="page-header">
        <h1>Jobs</h1>
        <button class="btn-primary" (click)="showForm = !showForm">
          {{ showForm ? 'Cancel' : '+ New Job' }}
        </button>
      </div>

      @if (showForm) {
        <form class="job-form" (ngSubmit)="saveJob()" #jobForm="ngForm">
          <div class="form-grid">
            <div class="form-group">
              <label for="employer">Employer</label>
              <input id="employer" [(ngModel)]="form.employer" name="employer" required placeholder="e.g. Acme Technologies">
            </div>
            <div class="form-group">
              <label for="title">Title</label>
              <input id="title" [(ngModel)]="form.title" name="title" required placeholder="e.g. Senior Software Engineer">
            </div>
            <div class="form-group">
              <label for="department">Department</label>
              <input id="department" [(ngModel)]="form.department" name="department" required placeholder="e.g. Engineering">
            </div>
            <div class="form-group">
              <label for="location">Location</label>
              <input id="location" [(ngModel)]="form.location" name="location" required placeholder="e.g. Remote">
            </div>
            <div class="form-group">
              <label for="employmentType">Type</label>
              <select id="employmentType" [(ngModel)]="form.employmentType" name="employmentType" required>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>
            <div class="form-group">
              <label for="status">Status</label>
              <select id="status" [(ngModel)]="form.status" name="status" required>
                <option value="DRAFT">Draft</option>
                <option value="OPEN">Open</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
          <div class="form-group full-width">
            <label for="description">Description</label>
            <textarea id="description" [(ngModel)]="form.description" name="description" rows="3" placeholder="Job description..."></textarea>
          </div>
          <button type="submit" class="btn-primary">{{ editingId ? 'Update Job' : 'Create Job' }}</button>
        </form>
      }

      <div class="employer-groups">
        @for (group of employerGroups; track group.employer) {
          <div class="employer-section">
            <button class="employer-header" (click)="group.collapsed = !group.collapsed"
                    [attr.aria-expanded]="!group.collapsed">
              <span class="employer-name">{{ group.employer }}</span>
              <span class="employer-meta">
                <span class="employer-count">{{ group.jobs.length }} job{{ group.jobs.length !== 1 ? 's' : '' }}</span>
                <span class="collapse-icon">{{ group.collapsed ? '▶' : '▼' }}</span>
              </span>
            </button>

            @if (!group.collapsed) {
              <div class="jobs-list">
                @for (job of group.jobs; track job.id) {
                  <div class="job-card">
                    <div class="job-info">
                      <h3>{{ job.title }}</h3>
                      <div class="job-meta">
                        <span class="badge" [class]="'status-' + job.status.toLowerCase()">{{ job.status }}</span>
                        <span>{{ formatType(job.employmentType) }}</span>
                        <span>{{ job.department }}</span>
                        <span>{{ job.location }}</span>
                      </div>
                      <div class="job-stats">
                        <span>{{ job.candidateCount }} candidate{{ job.candidateCount !== 1 ? 's' : '' }}</span>
                        <span class="sep">·</span>
                        <span>Posted {{ formatDate(job.createdAt) }}</span>
                      </div>
                    </div>
                    <div class="job-actions">
                      <a [routerLink]="['/jobs', job.id, 'pipeline']" class="btn-outline">Pipeline →</a>
                      <button class="btn-icon" (click)="editJob(job)" aria-label="Edit job">✏️</button>
                      <button class="btn-icon danger" (click)="deleteJob(job.id)" aria-label="Delete job">🗑️</button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        } @empty {
          <div class="empty-state">
            <p>No jobs yet. Create your first job posting to get started.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .jobs-page { max-width: 900px; }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    h1 { font-size: 1.75rem; font-weight: 700; }

    .btn-primary {
      background: var(--accent);
      color: white;
      border: none;
      padding: 0.6rem 1.25rem;
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.9rem;
      transition: background 0.15s;
    }
    .btn-primary:hover { background: var(--accent-hover); }

    .btn-outline {
      border: 1px solid var(--accent);
      color: var(--accent);
      padding: 0.4rem 0.9rem;
      border-radius: var(--radius);
      font-weight: 500;
      font-size: 0.85rem;
      transition: all 0.15s;
    }
    .btn-outline:hover { background: rgba(99,102,241,0.1); }

    .btn-icon {
      background: none;
      border: none;
      font-size: 1rem;
      padding: 0.35rem;
      border-radius: var(--radius);
      transition: background 0.15s;
    }
    .btn-icon:hover { background: rgba(255,255,255,0.05); }
    .btn-icon.danger:hover { background: rgba(239,68,68,0.15); }

    .job-form {
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
    input, select, textarea {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.55rem 0.75rem;
      color: var(--text-primary);
      font-size: 0.9rem;
      font-family: inherit;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--accent);
    }
    textarea { resize: vertical; }

    .jobs-list { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.5rem; }

    .employer-groups { display: flex; flex-direction: column; gap: 1rem; }

    .employer-section {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .employer-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.9rem 1.25rem;
      background: none;
      border: none;
      color: var(--text-primary);
      cursor: pointer;
      font-size: 1rem;
      font-weight: 700;
      text-align: left;
      transition: background 0.15s;
    }
    .employer-header:hover { background: rgba(99,102,241,0.06); }

    .employer-name { font-size: 1rem; font-weight: 700; }

    .employer-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .employer-count {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-secondary);
      background: rgba(99,102,241,0.12);
      padding: 0.15rem 0.55rem;
      border-radius: 10px;
    }

    .collapse-icon {
      font-size: 0.65rem;
      color: var(--text-secondary);
    }

    .jobs-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 0 0.75rem 0.75rem;
    }

    .job-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: border-color 0.15s;
      margin-top: 0.5rem;
    }
    .job-card:hover { border-color: var(--accent); }

    h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem; }

    .job-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 0.35rem;
    }

    .badge {
      padding: 0.15rem 0.55rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .status-open { background: rgba(34,197,94,0.15); color: var(--success); }
    .status-draft { background: rgba(148,163,184,0.15); color: var(--text-secondary); }
    .status-closed { background: rgba(239,68,68,0.15); color: var(--danger); }
    .status-on_hold { background: rgba(245,158,11,0.15); color: var(--warning); }

    .job-stats {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
    .sep { margin: 0 0.25rem; }

    .job-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
      background: var(--bg-card);
      border: 1px dashed var(--border);
      border-radius: var(--radius);
    }

    @media (max-width: 640px) {
      .job-card { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .job-actions { width: 100%; justify-content: flex-end; }
    }
  `]
})
export class JobsComponent implements OnInit {
  jobs: Job[] = [];
  employerGroups: EmployerGroup[] = [];
  showForm = false;
  editingId: number | null = null;
  form: JobRequest = this.emptyForm();

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

  formatType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private emptyForm(): JobRequest {
    return { employer: '', title: '', department: '', location: '', description: '', status: 'OPEN', employmentType: 'FULL_TIME' };
  }
}
