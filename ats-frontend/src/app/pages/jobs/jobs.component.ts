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
  template: `
    <div class="jobs-page">
      <div class="page-header">
        <h1>Jobs</h1>
        <div class="header-actions">
          <button class="btn-toggle" [class.active]="showOpenOnly" (click)="toggleOpenOnly()"
                  [attr.aria-pressed]="showOpenOnly">
            <span class="toggle-dot"></span>
            Open Positions Only
            @if (openJobCount > 0) {
              <span class="toggle-count">{{ openJobCount }}</span>
            }
          </button>
          <button class="btn-primary" (click)="showForm = !showForm">
            {{ showForm ? 'Cancel' : '+ New Job' }}
          </button>
        </div>
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
            <div class="form-group full-width">
              <label for="requiredSkills">Required Skills <span class="hint">(comma-separated)</span></label>
              <input id="requiredSkills" [(ngModel)]="form.requiredSkills" name="requiredSkills" placeholder="e.g. Java, Spring Boot, Docker, AWS">
            </div>
            <button type="submit" class="btn-primary">{{ editingId ? 'Update Job' : 'Create Job' }}</button>
        </form>
      }

      <div class="employer-groups">
        @for (group of pagedGroups; track group.employer) {
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
                  <div class="job-card" (click)="openJobDetail(job)">
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
                        @if (job.requiredSkills) {
                          <span class="sep">·</span>
                          <span class="skills-preview">{{ job.requiredSkills }}</span>
                        }
                      </div>
                    </div>
                    <div class="job-actions">
                      <button class="btn-matches" (click)="toggleTopMatches(job.id); $event.stopPropagation()" [class.active]="expandedJobId === job.id">
                        ⭐ Top Matches
                      </button>
                      <a [routerLink]="['/jobs', job.id, 'pipeline']" class="btn-outline" (click)="$event.stopPropagation()">Pipeline →</a>
                      <button class="btn-icon" (click)="editJob(job); $event.stopPropagation()" aria-label="Edit job">✏️</button>
                      <button class="btn-icon danger" (click)="deleteJob(job.id); $event.stopPropagation()" aria-label="Delete job">🗑️</button>
                    </div>
                  </div>
                  @if (expandedJobId === job.id) {
                    <div class="top-matches-panel">
                      <div class="matches-header">
                        <span class="matches-title">Top 5 Matching Candidates</span>
                        @if (loadingMatches) {
                          <span class="matches-loading">Loading…</span>
                        }
                      </div>
                      @if (!loadingMatches && topMatches.length === 0) {
                        <p class="no-matches">No skill data available for matching. Add required skills to this job and skills to candidates.</p>
                      }
                      @if (!loadingMatches && topMatches.length > 0) {
                        <div class="matches-list">
                          @for (match of topMatches; track match.candidateId; let i = $index) {
                            <div class="match-row">
                              <span class="match-rank">#{{ i + 1 }}</span>
                              <div class="match-info">
                                <span class="match-name">{{ match.firstName }} {{ match.lastName }}</span>
                                <span class="match-email">{{ match.email }}</span>
                              </div>
                              <div class="match-skills">
                                @for (skill of match.matchedSkills; track skill) {
                                  <span class="match-skill-tag">{{ skill }}</span>
                                }
                              </div>
                              <div class="match-pct-wrap">
                                <div class="match-bar">
                                  <div class="match-fill" [style.width.%]="match.matchPercent"></div>
                                </div>
                                <span class="match-pct">{{ match.matchPercent }}%</span>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
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
      @if (jobsTotalPages > 1) {
        <nav class="pagination" aria-label="Page navigation">
          <button class="pg-btn" (click)="prevJobsPage()" [disabled]="jobsPage === 1" aria-label="Previous page">‹</button>
          @for (p of jobsPageNumbers; track $index) {
            @if (p === '...') {
              <span class="pg-ellipsis">…</span>
            } @else {
              <button class="pg-btn" [class.active]="p === jobsPage" (click)="goToJobsPage(p)">{{ p }}</button>
            }
          }
          <button class="pg-btn" (click)="nextJobsPage()" [disabled]="jobsPage === jobsTotalPages" aria-label="Next page">›</button>
          <span class="pg-info">{{ jobsPage }} / {{ jobsTotalPages }}</span>
        </nav>
      }
    </div>

    @if (selectedJob) {
      <div class="modal-backdrop" (click)="closeJobDetail()">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Job Details">
          <div class="modal-header">
            <div>
              <h2>{{ selectedJob.title }}</h2>
              <span class="detail-employer">{{ selectedJob.employer }}</span>
            </div>
            <button class="modal-close" (click)="closeJobDetail()" aria-label="Close">&times;</button>
          </div>
          <div class="detail-body">
            <div class="detail-badges">
              <span class="badge" [class]="'status-' + selectedJob.status.toLowerCase()">{{ selectedJob.status }}</span>
              <span class="detail-chip">{{ formatType(selectedJob.employmentType) }}</span>
              <span class="detail-chip">{{ selectedJob.department }}</span>
              <span class="detail-chip">📍 {{ selectedJob.location }}</span>
              <span class="detail-chip">👥 {{ selectedJob.candidateCount }} candidate{{ selectedJob.candidateCount !== 1 ? 's' : '' }}</span>
            </div>
            @if (selectedJob.description) {
              <div class="detail-section">
                <div class="detail-section-label">Description</div>
                <div class="detail-text">{{ selectedJob.description }}</div>
              </div>
            }
            @if (selectedJob.requiredSkills) {
              <div class="detail-section">
                <div class="detail-section-label">Required Skills</div>
                <div class="skills-chips-row">
                  @for (skill of parseSkills(selectedJob.requiredSkills); track skill) {
                    <span class="skill-chip-detail">{{ skill }}</span>
                  }
                </div>
              </div>
            }
            <div class="detail-meta-row">
              <span>Posted {{ formatDate(selectedJob.createdAt) }}</span>
              <span>Updated {{ formatDate(selectedJob.updatedAt) }}</span>
            </div>
            <div class="detail-actions">
              <a [routerLink]="['/jobs', selectedJob.id, 'pipeline']" class="btn-primary" (click)="closeJobDetail()">View Pipeline →</a>
              <button class="btn-outline-detail" (click)="editJob(selectedJob); closeJobDetail()">Edit Job</button>
            </div>
          </div>
        </div>
      </div>
    }
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

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .btn-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      padding: 0.5rem 1rem;
      border-radius: var(--radius);
      font-size: 0.88rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-toggle:hover { border-color: var(--accent); color: var(--accent); }
    .btn-toggle.active {
      background: rgba(34,197,94,0.12);
      border-color: var(--success);
      color: var(--success);
    }
    .toggle-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--border);
      transition: background 0.2s;
      flex-shrink: 0;
    }
    .btn-toggle.active .toggle-dot { background: var(--success); }
    .toggle-count {
      background: var(--success);
      color: white;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.1rem 0.45rem;
      border-radius: 10px;
      line-height: 1.4;
    }

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
      cursor: pointer;
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
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0;
    }
    .sep { margin: 0 0.25rem; }

    .skills-preview {
      font-style: italic;
      max-width: 260px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: inline-block;
      vertical-align: middle;
    }

    .job-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

    .btn-matches {
      border: 1px solid var(--accent);
      color: var(--accent);
      background: none;
      padding: 0.4rem 0.9rem;
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.82rem;
      transition: all 0.15s;
      cursor: pointer;
    }
    .btn-matches:hover, .btn-matches.active {
      background: rgba(99,102,241,0.12);
      box-shadow: 0 0 0 2px rgba(99,102,241,0.25);
    }

    .top-matches-panel {
      background: var(--bg-primary);
      border: 1px solid var(--accent);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      margin-top: 0.5rem;
    }

    .matches-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .matches-title { font-weight: 700; font-size: 0.9rem; }
    .matches-loading { font-size: 0.8rem; color: var(--text-secondary); }

    .no-matches {
      font-size: 0.85rem;
      color: var(--text-secondary);
      font-style: italic;
    }

    .matches-list { display: flex; flex-direction: column; gap: 0.5rem; }

    .match-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.6rem 0.9rem;
      flex-wrap: wrap;
    }

    .match-rank {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--accent);
      min-width: 1.75rem;
    }

    .match-info {
      display: flex;
      flex-direction: column;
      min-width: 140px;
      flex: 0 0 auto;
    }
    .match-name { font-weight: 600; font-size: 0.88rem; }
    .match-email { font-size: 0.75rem; color: var(--text-secondary); }

    .match-skills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      flex: 1;
    }
    .match-skill-tag {
      background: rgba(99,102,241,0.12);
      color: var(--accent);
      font-size: 0.72rem;
      padding: 0.1rem 0.45rem;
      border-radius: 10px;
      font-weight: 500;
    }

    .match-pct-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
      min-width: 110px;
    }
    .match-bar {
      flex: 1;
      height: 6px;
      background: var(--border);
      border-radius: 3px;
      overflow: hidden;
    }
    .match-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), #22c55e);
      border-radius: 3px;
      transition: width 0.4s ease;
    }
    .match-pct { font-size: 0.78rem; font-weight: 700; color: var(--success); min-width: 2.5rem; text-align: right; }

    .hint { font-size: 0.75rem; color: var(--text-secondary); font-weight: 400; }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
      background: var(--bg-card);
      border: 1px dashed var(--border);
      border-radius: var(--radius);
    }

    /* Detail modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .modal-header h2 { font-size: 1.15rem; font-weight: 700; margin: 0; }
    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-secondary);
      cursor: pointer;
      line-height: 1;
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .modal-close:hover { color: var(--danger); background: rgba(239,68,68,0.1); }
    .detail-employer { font-size: 0.82rem; color: var(--text-secondary); display: block; margin-top: 0.15rem; }
    .detail-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .detail-badges { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
    .detail-chip {
      background: rgba(99,102,241,0.1);
      color: var(--text-secondary);
      font-size: 0.8rem;
      padding: 0.25rem 0.65rem;
      border-radius: 12px;
      font-weight: 500;
    }
    .detail-section { display: flex; flex-direction: column; gap: 0.4rem; }
    .detail-section-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .detail-text { font-size: 0.88rem; line-height: 1.6; white-space: pre-line; }
    .skills-chips-row { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .skill-chip-detail {
      background: rgba(99,102,241,0.12);
      color: var(--accent);
      font-size: 0.78rem;
      padding: 0.2rem 0.6rem;
      border-radius: 10px;
      font-weight: 500;
    }
    .detail-meta-row {
      display: flex;
      gap: 1.5rem;
      font-size: 0.78rem;
      color: var(--text-secondary);
      padding-top: 0.5rem;
      border-top: 1px solid var(--border);
    }
    .detail-actions {
      display: flex;
      gap: 0.75rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border);
    }
    .btn-outline-detail {
      border: 1px solid var(--border);
      color: var(--text-secondary);
      background: none;
      padding: 0.55rem 1.1rem;
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
    }
    .btn-outline-detail:hover { border-color: var(--accent); color: var(--accent); }

    /* Pagination */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      margin-top: 1.5rem;
      flex-wrap: wrap;
    }
    .pg-btn {
      min-width: 2rem;
      height: 2rem;
      padding: 0 0.5rem;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text-secondary);
      font-size: 0.88rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .pg-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
    .pg-btn.active { background: var(--accent); border-color: var(--accent); color: white; font-weight: 700; }
    .pg-btn:disabled { opacity: 0.35; cursor: default; }
    .pg-ellipsis { color: var(--text-secondary); font-size: 0.88rem; padding: 0 0.1rem; line-height: 2rem; }
    .pg-info { font-size: 0.8rem; color: var(--text-secondary); margin-left: 0.4rem; white-space: nowrap; }

    @media (max-width: 640px) {
      .job-card { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .job-actions { width: 100%; justify-content: flex-end; flex-wrap: wrap; }
      .match-row { flex-direction: column; align-items: flex-start; }
    }
  `]
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
    return { employer: '', title: '', department: '', location: '', description: '', requiredSkills: '', status: 'OPEN', employmentType: 'FULL_TIME' };
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
      ? this.employerGroups
          .map(g => ({ ...g, jobs: g.jobs.filter(j => j.status === 'OPEN') }))
          .filter(g => g.jobs.length > 0)
      : this.employerGroups;
    const start = (this.jobsPage - 1) * this.jobsPageSize;
    return source.slice(start, start + this.jobsPageSize);
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
