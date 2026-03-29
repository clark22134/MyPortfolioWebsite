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
  template: `
    <div class="talent-page">
      <div class="page-header">
        <div>
          <h1>Talent Pool</h1>
          <p class="subtitle">{{ totalCount }} candidate{{ totalCount !== 1 ? 's' : '' }} across all jobs</p>
        </div>
        <div class="header-actions">
          <button class="btn-outline" (click)="openUpload()">⬆ Upload Resume</button>
          <button class="btn-primary" (click)="openAdd()">+ Add Candidate</button>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="search-bar-wrapper">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input
            class="search-input"
            type="text"
            placeholder="Search by name…"
            [(ngModel)]="filters.name"
            (ngModelChange)="onNameChange($event)"
            aria-label="Search candidates by name">
          @if (filters.name) {
            <button class="clear-btn" (click)="clearField('name')" aria-label="Clear name">×</button>
          }
        </div>

        <div class="search-input-wrap">
          <span class="search-icon">🏷️</span>
          <input
            class="search-input"
            type="text"
            placeholder="Filter by skills (comma-separated)…"
            [(ngModel)]="filters.skills"
            (ngModelChange)="onSkillsChange($event)"
            aria-label="Filter by skills">
          @if (filters.skills) {
            <button class="clear-btn" (click)="clearField('skills')" aria-label="Clear skills">×</button>
          }
        </div>

        <select class="filter-select" [(ngModel)]="filters.stage" (ngModelChange)="runSearch()" aria-label="Filter by stage">
          <option value="">All Stages</option>
          @for (s of allStages; track s) {
            <option [value]="s">{{ stageLabel(s) }}</option>
          }
        </select>

        <select class="filter-select" [(ngModel)]="filters.jobId" (ngModelChange)="runSearch()" aria-label="Filter by job">
          <option [ngValue]="null">All Jobs</option>
          @for (job of jobs; track job.id) {
            <option [ngValue]="job.id">{{ job.title }} ({{ job.employer }})</option>
          }
        </select>

        <button class="btn-reset" (click)="resetFilters()" [disabled]="!hasActiveFilter()">
          Reset Filters
        </button>
      </div>

      <!-- Results summary -->
      @if (hasActiveFilter()) {
        <div class="results-summary">
          Showing <strong>{{ candidates.length }}</strong> result{{ candidates.length !== 1 ? 's' : '' }}
          @if (candidates.length !== totalCount) { of {{ totalCount }} total }
        </div>
      }

      <!-- Candidate grid -->
      @if (loading) {
        <div class="loading-state">
          <span class="spinner"></span> Loading candidates…
        </div>
      } @else if (candidates.length === 0) {
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>No candidates match your search. Try adjusting your filters.</p>
          @if (hasActiveFilter()) {
            <button class="btn-reset" (click)="resetFilters()">Clear Filters</button>
          }
        </div>
      } @else {
        <div class="candidates-grid">
          @for (c of pagedCandidates; track c.id) {
            <div class="candidate-card" (click)="openCandidateDetail(c)">
              <div class="card-top">
                <div class="avatar">{{ c.firstName[0] }}{{ c.lastName[0] }}</div>
                <div class="card-info">
                  <span class="candidate-name">{{ c.firstName }} {{ c.lastName }}</span>
                  <span class="candidate-job">{{ c.jobTitle }}</span>
                </div>
                <span class="stage-badge" [style.background]="stageBg(c.stage)" [style.color]="stageColor(c.stage)">
                  {{ stageLabel(c.stage) }}
                </span>
                <div class="card-actions">
                  <button class="btn-card-edit" (click)="openEdit(c); $event.stopPropagation()" aria-label="Edit candidate">✏️</button>
                  <button class="btn-card-delete" (click)="deleteCandidate(c.id); $event.stopPropagation()" aria-label="Delete candidate">🗑️</button>
                </div>
              </div>

              <div class="contact-row">
                <span class="contact-item">✉️ {{ c.email }}</span>
                @if (c.phone) {
                  <span class="contact-item">📞 {{ c.phone }}</span>
                }
              </div>

              @if (c.skills) {
                <div class="skills-row">
                  @for (skill of parseSkills(c.skills); track skill) {
                    <span class="skill-chip"
                          [class.highlight]="isSkillMatch(skill)"
                          (click)="filterBySkill(skill); $event.stopPropagation()">{{ skill }}</span>
                  }
                </div>
              }

              @if (c.notes) {
                <div class="card-notes">{{ c.notes }}</div>
              }

              <div class="card-footer">
                <span class="applied-date">Applied {{ formatDate(c.appliedAt) }}</span>
                @if (!c.talentPool) {
                  <a [routerLink]="['/jobs', c.jobId, 'pipeline']" class="pipeline-link" (click)="$event.stopPropagation()">View in Pipeline →</a>
                }
              </div>
            </div>
          }
        </div>
        @if (totalPages > 1) {
          <nav class="pagination" aria-label="Page navigation">
            <button class="pg-btn" (click)="prevPage()" [disabled]="page === 1" aria-label="Previous page">‹</button>
            @for (p of pageNumbers; track $index) {
              @if (p === '...') {
                <span class="pg-ellipsis">…</span>
              } @else {
                <button class="pg-btn" [class.active]="p === page" (click)="goToPage(p)">{{ p }}</button>
              }
            }
            <button class="pg-btn" (click)="nextPage()" [disabled]="page === totalPages" aria-label="Next page">›</button>
            <span class="pg-info">{{ page }} / {{ totalPages }}</span>
          </nav>
        }
      }
    </div>

    @if (showAddModal) {
      <div class="modal-backdrop" (click)="closeAdd()">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Add Candidate">
          <div class="modal-header">
            <h2>Add Candidate</h2>
            <button class="modal-close" (click)="closeAdd()" aria-label="Close">×</button>
          </div>
          <form class="modal-form" (ngSubmit)="saveAdd()">
            <div class="form-grid">
              <div class="form-group">
                <label for="addFirstName">First Name *</label>
                <input id="addFirstName" [(ngModel)]="addForm.firstName" name="addFirstName" required>
              </div>
              <div class="form-group">
                <label for="addLastName">Last Name *</label>
                <input id="addLastName" [(ngModel)]="addForm.lastName" name="addLastName" required>
              </div>
              <div class="form-group">
                <label for="addEmail">Email *</label>
                <input id="addEmail" [(ngModel)]="addForm.email" name="addEmail" type="email" required>
              </div>
              <div class="form-group">
                <label for="addPhone">Phone</label>
                <input id="addPhone" [(ngModel)]="addForm.phone" name="addPhone">
              </div>
              <div class="form-group">
                <label for="addJob">Job *</label>
                <select id="addJob" [(ngModel)]="addForm.jobId" name="addJob" required>
                  <option [ngValue]="undefined">Select a job…</option>
                  @for (job of jobs; track job.id) {
                    <option [ngValue]="job.id">{{ job.title }} ({{ job.employer }})</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label for="addStage">Stage</label>
                <select id="addStage" [(ngModel)]="addForm.stage" name="addStage">
                  @for (s of allStages; track s) {
                    <option [value]="s">{{ stageLabel(s) }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-group full-width">
              <label for="addSkills">Skills <span class="hint">(comma-separated)</span></label>
              <input id="addSkills" [(ngModel)]="addForm.skills" name="addSkills" placeholder="e.g. Java, Docker, AWS">
            </div>
            <div class="form-group full-width">
              <label for="addAddress">Address <span class="hint">(for commute distance matching)</span></label>
              <input id="addAddress" [(ngModel)]="addForm.address" name="addAddress" placeholder="e.g. 384 Grand Ave, Oakland, CA 94610">
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label for="addLat">Latitude <span class="hint">(optional)</span></label>
                <input id="addLat" type="number" step="any" [(ngModel)]="addForm.latitude" name="addLat" placeholder="e.g. 37.804">
              </div>
              <div class="form-group">
                <label for="addLng">Longitude <span class="hint">(optional)</span></label>
                <input id="addLng" type="number" step="any" [(ngModel)]="addForm.longitude" name="addLng" placeholder="e.g. -122.271">
              </div>
              <div class="form-group">
                <label for="addDays">Days at Last Assignment</label>
                <input id="addDays" type="number" min="0" [(ngModel)]="addForm.lastAssignmentDays" name="addDays" placeholder="e.g. 365">
              </div>
            </div>
            <div class="form-group full-width">
              <label for="addNotes">Notes</label>
              <textarea id="addNotes" [(ngModel)]="addForm.notes" name="addNotes" rows="3"></textarea>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-cancel" (click)="closeAdd()">Cancel</button>
              <button type="submit" class="btn-primary">Add Candidate</button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (editingCandidate) {
      <div class="modal-backdrop" (click)="closeEdit()">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Edit Candidate">
          <div class="modal-header">
            <h2>Edit Candidate</h2>
            <button class="modal-close" (click)="closeEdit()" aria-label="Close">×</button>
          </div>
          <form class="modal-form" (ngSubmit)="saveEdit()">
            <div class="form-grid">
              <div class="form-group">
                <label for="editFirstName">First Name *</label>
                <input id="editFirstName" [(ngModel)]="editForm.firstName" name="editFirstName" required>
              </div>
              <div class="form-group">
                <label for="editLastName">Last Name *</label>
                <input id="editLastName" [(ngModel)]="editForm.lastName" name="editLastName" required>
              </div>
              <div class="form-group">
                <label for="editEmail">Email *</label>
                <input id="editEmail" [(ngModel)]="editForm.email" name="editEmail" type="email" required>
              </div>
              <div class="form-group">
                <label for="editPhone">Phone</label>
                <input id="editPhone" [(ngModel)]="editForm.phone" name="editPhone">
              </div>
              <div class="form-group">
                <label for="editJob">Job</label>
                <select id="editJob" [(ngModel)]="editForm.jobId" name="editJob">
                  @for (job of jobs; track job.id) {
                    <option [ngValue]="job.id">{{ job.title }} ({{ job.employer }})</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label for="editStage">Stage</label>
                <select id="editStage" [(ngModel)]="editForm.stage" name="editStage">
                  @for (s of allStages; track s) {
                    <option [value]="s">{{ stageLabel(s) }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-group full-width">
              <label for="editSkills">Skills <span class="hint">(comma-separated)</span></label>
              <input id="editSkills" [(ngModel)]="editForm.skills" name="editSkills" placeholder="e.g. Java, Docker, AWS">
            </div>
            <div class="form-group full-width">
              <label for="editAddress">Address <span class="hint">(for commute distance matching)</span></label>
              <input id="editAddress" [(ngModel)]="editForm.address" name="editAddress" placeholder="e.g. 384 Grand Ave, Oakland, CA 94610">
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label for="editLat">Latitude <span class="hint">(optional)</span></label>
                <input id="editLat" type="number" step="any" [(ngModel)]="editForm.latitude" name="editLat" placeholder="e.g. 37.804">
              </div>
              <div class="form-group">
                <label for="editLng">Longitude <span class="hint">(optional)</span></label>
                <input id="editLng" type="number" step="any" [(ngModel)]="editForm.longitude" name="editLng" placeholder="e.g. -122.271">
              </div>
              <div class="form-group">
                <label for="editDays">Days at Last Assignment</label>
                <input id="editDays" type="number" min="0" [(ngModel)]="editForm.lastAssignmentDays" name="editDays" placeholder="e.g. 365">
              </div>
            </div>
            <div class="form-group full-width">
              <label for="editNotes">Notes</label>
              <textarea id="editNotes" [(ngModel)]="editForm.notes" name="editNotes" rows="3"></textarea>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-cancel" (click)="closeEdit()">Cancel</button>
              <button type="submit" class="btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (selectedCandidate) {
      <div class="modal-backdrop" (click)="closeCandidateDetail()">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Candidate Details">
          <div class="modal-header">
            <div class="detail-title-row">
              <div class="avatar-lg">{{ selectedCandidate.firstName[0] }}{{ selectedCandidate.lastName[0] }}</div>
              <div>
                <h2>{{ selectedCandidate.firstName }} {{ selectedCandidate.lastName }}</h2>
                <span class="detail-employer">{{ selectedCandidate.jobTitle }}</span>
              </div>
            </div>
            <button class="modal-close" (click)="closeCandidateDetail()" aria-label="Close">&times;</button>
          </div>
          <div class="detail-body">
            <div class="detail-badges">
              <span class="stage-badge" [style.background]="stageBg(selectedCandidate.stage)" [style.color]="stageColor(selectedCandidate.stage)">
                {{ stageLabel(selectedCandidate.stage) }}
              </span>
            </div>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-section-label">Email</span>
                <span>{{ selectedCandidate.email }}</span>
              </div>
              @if (selectedCandidate.phone) {
                <div class="detail-item">
                  <span class="detail-section-label">Phone</span>
                  <span>{{ selectedCandidate.phone }}</span>
                </div>
              }
              <div class="detail-item">
                <span class="detail-section-label">Applied</span>
                <span>{{ formatDate(selectedCandidate.appliedAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-section-label">Last Updated</span>
                <span>{{ formatDate(selectedCandidate.updatedAt) }}</span>
              </div>
              @if (selectedCandidate.address) {
                <div class="detail-item">
                  <span class="detail-section-label">Address</span>
                  <span>{{ selectedCandidate.address }}</span>
                </div>
              }
              @if (selectedCandidate.lastAssignmentDays) {
                <div class="detail-item">
                  <span class="detail-section-label">Last Assignment</span>
                  <span>{{ selectedCandidate.lastAssignmentDays }} days</span>
                </div>
              }
            </div>
            @if (selectedCandidate.skills) {
              <div class="detail-section">
                <div class="detail-section-label">Skills</div>
                <div class="skills-chips-row">
                  @for (skill of parseSkills(selectedCandidate.skills); track skill) {
                    <span class="skill-chip-detail">{{ skill }}</span>
                  }
                </div>
              </div>
            }
            @if (selectedCandidate.notes) {
              <div class="detail-section">
                <div class="detail-section-label">Notes</div>
                <div class="detail-text">{{ selectedCandidate.notes }}</div>
              </div>
            }
            <div class="detail-actions">
              @if (!selectedCandidate.talentPool) {
                <a [routerLink]="['/jobs', selectedCandidate.jobId, 'pipeline']" class="btn-primary" (click)="closeCandidateDetail()">View in Pipeline →</a>
              }
              <button class="btn-outline-detail" (click)="openEdit(selectedCandidate); closeCandidateDetail()">Edit</button>
            </div>
          </div>
        </div>
      </div>
    }

    @if (showUploadModal) {
      <div class="modal-backdrop" (click)="closeUpload()">
        <div class="modal modal-upload" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Upload Resume">
          <div class="modal-header">
            <h2>Upload Resume to Talent Pool</h2>
            <button class="modal-close" (click)="closeUpload()" aria-label="Close">×</button>
          </div>
          <div class="upload-body">
            <p class="upload-hint">Upload a PDF, DOCX, or TXT resume. The candidate's name, email, phone, and skills will be extracted automatically.</p>
            <label class="drop-zone" [class.has-file]="uploadFile" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
              @if (uploadFile) {
                <span class="drop-zone-icon">📄</span>
                <span class="drop-zone-name">{{ uploadFile.name }}</span>
                <span class="drop-zone-size">{{ formatFileSize(uploadFile.size) }}</span>
              } @else {
                <span class="drop-zone-icon">⬆</span>
                <span class="drop-zone-text">Drag &amp; drop a file here, or click to browse</span>
                <span class="drop-zone-sub">PDF, DOCX, TXT · Max 10 MB</span>
              }
              <input type="file" accept=".pdf,.docx,.txt" (change)="onFileChange($event)" class="file-input" aria-label="Choose resume file">
            </label>
            @if (uploadError) {
              <div class="upload-error">{{ uploadError }}</div>
            }
            <div class="modal-actions">
              <button type="button" class="btn-cancel" (click)="closeUpload()">Cancel</button>
              <button type="button" class="btn-primary" [disabled]="!uploadFile || uploading" (click)="submitUpload()">
                @if (uploading) { Uploading… } @else { Upload &amp; Add to Talent Pool }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .talent-page { max-width: 1200px; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }
    h1 { font-size: 1.75rem; font-weight: 700; }
    .subtitle { color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.2rem; }
    .header-actions {
      display: flex;
      gap: 0.6rem;
      align-items: center;
    }
    .btn-outline {
      background: none;
      border: 1px solid var(--border);
      color: var(--text-secondary);
      padding: 0.6rem 1.1rem;
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
      white-space: nowrap;
    }
    .btn-outline:hover { border-color: var(--accent); color: var(--accent); }

    /* Search bar */
    .search-bar-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
    }

    .search-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 200px;
    }
    .search-icon {
      position: absolute;
      left: 0.6rem;
      font-size: 0.9rem;
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.55rem 2rem 0.55rem 2.1rem;
      color: var(--text-primary);
      font-size: 0.9rem;
      font-family: inherit;
    }
    .search-input:focus { outline: none; border-color: var(--accent); }
    .clear-btn {
      position: absolute;
      right: 0.5rem;
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1rem;
      cursor: pointer;
      line-height: 1;
      padding: 0.1rem 0.25rem;
      border-radius: 4px;
    }
    .clear-btn:hover { color: var(--danger); }

    .filter-select {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.55rem 0.75rem;
      color: var(--text-primary);
      font-size: 0.88rem;
      font-family: inherit;
      min-width: 150px;
    }
    .filter-select:focus { outline: none; border-color: var(--accent); }

    .btn-reset {
      background: none;
      border: 1px solid var(--border);
      color: var(--text-secondary);
      padding: 0.5rem 1rem;
      border-radius: var(--radius);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .btn-reset:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
    .btn-reset:disabled { opacity: 0.4; cursor: default; }

    .results-summary {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 1rem;
    }

    /* States */
    .loading-state {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 3rem;
      justify-content: center;
      color: var(--text-secondary);
    }
    .spinner {
      width: 20px; height: 20px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
      background: var(--bg-card);
      border: 1px dashed var(--border);
      border-radius: var(--radius);
    }
    .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }

    /* Grid */
    .candidates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
      gap: 1rem;
    }

    .candidate-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      transition: border-color 0.15s, box-shadow 0.15s;
      cursor: pointer;
    }
    .candidate-card:hover {
      border-color: var(--accent);
      box-shadow: 0 4px 16px rgba(99,102,241,0.1);
    }

    .card-top {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .avatar {
      width: 38px; height: 38px;
      background: linear-gradient(135deg, var(--accent), #8b5cf6);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      color: white;
      flex-shrink: 0;
      text-transform: uppercase;
    }

    .card-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .candidate-name { font-weight: 700; font-size: 0.95rem; }
    .candidate-job {
      font-size: 0.78rem;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .stage-badge {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }

    .contact-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .contact-item {
      font-size: 0.78rem;
      color: var(--text-secondary);
      overflow-wrap: break-word;
      word-break: break-word;
      min-width: 0;
    }

    .skills-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
    }
    .skill-chip {
      background: rgba(99,102,241,0.1);
      color: var(--accent);
      font-size: 0.72rem;
      padding: 0.15rem 0.5rem;
      border-radius: 10px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }
    .skill-chip:hover { background: rgba(99,102,241,0.25); }
    .skill-chip.highlight {
      background: var(--accent);
      color: white;
    }

    .card-notes {
      font-size: 0.78rem;
      color: var(--text-secondary);
      padding-top: 0.5rem;
      border-top: 1px solid var(--border);
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      text-overflow: ellipsis;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border);
      font-size: 0.75rem;
    }
    .applied-date { color: var(--text-secondary); }
    .pipeline-link {
      color: var(--accent);
      font-weight: 500;
      white-space: nowrap;
    }
    .pipeline-link:hover { text-decoration: underline; }

    /* Card actions */
    .card-actions {
      display: flex;
      gap: 0.25rem;
      flex-shrink: 0;
      opacity: 0;
      transition: opacity 0.15s;
      margin-left: auto;
    }
    .candidate-card:hover .card-actions { opacity: 1; }
    .btn-card-edit, .btn-card-delete {
      background: none;
      border: none;
      font-size: 0.9rem;
      cursor: pointer;
      padding: 0.2rem 0.3rem;
      border-radius: 4px;
      line-height: 1;
      transition: background 0.15s;
    }
    .btn-card-edit:hover { background: rgba(99,102,241,0.15); }
    .btn-card-delete:hover { background: rgba(239,68,68,0.1); }

    /* Primary button */
    .btn-primary {
      background: var(--accent);
      color: white;
      border: none;
      padding: 0.6rem 1.25rem;
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.9rem;
      transition: background 0.15s;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-primary:hover { background: var(--accent-hover); }

    /* Modals */
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
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .modal-header h2 { font-size: 1.15rem; font-weight: 700; }
    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-secondary);
      cursor: pointer;
      line-height: 1;
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
    }
    .modal-close:hover { color: var(--danger); background: rgba(239,68,68,0.1); }
    .modal-form { padding: 1.25rem 1.5rem; }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-group.full-width { margin-bottom: 1rem; }
    label { font-size: 0.85rem; font-weight: 500; color: var(--text-secondary); }
    .hint { font-size: 0.75rem; font-weight: 400; }
    input, select, textarea {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.55rem 0.75rem;
      color: var(--text-primary);
      font-size: 0.9rem;
      font-family: inherit;
    }
    input:focus, select:focus, textarea:focus { outline: none; border-color: var(--accent); }
    textarea { resize: vertical; }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .btn-cancel {
      background: none;
      border: 1px solid var(--border);
      color: var(--text-secondary);
      padding: 0.6rem 1.25rem;
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
    }
    .btn-cancel:hover { border-color: var(--text-secondary); color: var(--text-primary); }

    /* Candidate detail modal extras */
    .detail-title-row { display: flex; align-items: center; gap: 0.75rem; }
    .avatar-lg {
      width: 48px; height: 48px;
      background: linear-gradient(135deg, var(--accent), #8b5cf6);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
      color: white;
      flex-shrink: 0;
      text-transform: uppercase;
    }
    .detail-employer { font-size: 0.82rem; color: var(--text-secondary); display: block; margin-top: 0.1rem; }
    .detail-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .detail-badges { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.75rem;
    }
    .detail-item { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.88rem; }
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

    /* Upload modal */
    .modal-upload { max-width: 480px; }
    .upload-body { padding: 1.25rem 1.5rem; }
    .upload-hint { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem; line-height: 1.5; }
    .drop-zone {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      border: 2px dashed var(--border);
      border-radius: var(--radius);
      padding: 2rem 1.5rem;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      background: var(--bg-primary);
      text-align: center;
    }
    .drop-zone:hover, .drop-zone.has-file { border-color: var(--accent); background: rgba(99,102,241,0.04); }
    .drop-zone-icon { font-size: 2rem; }
    .drop-zone-text { font-size: 0.9rem; font-weight: 500; color: var(--text-primary); }
    .drop-zone-sub { font-size: 0.78rem; color: var(--text-secondary); }
    .drop-zone-name { font-size: 0.9rem; font-weight: 600; color: var(--accent); }
    .drop-zone-size { font-size: 0.78rem; color: var(--text-secondary); }
    .file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
    .upload-error { color: var(--danger); font-size: 0.85rem; margin-top: 0.75rem; }

    @media (max-width: 768px) {
      .page-header { flex-wrap: wrap; gap: 0.75rem; }
      .header-actions { width: 100%; }
      .search-bar-wrapper { flex-direction: column; }
      .search-input-wrap { min-width: 100%; }
      .filter-select { width: 100%; }
      .candidates-grid { grid-template-columns: 1fr; }
      .candidate-card { min-width: 0; }
    }
  `]
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
