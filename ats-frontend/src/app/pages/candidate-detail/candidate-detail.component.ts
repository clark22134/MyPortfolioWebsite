import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CandidateService } from '../../services/candidate.service';
import { NoteService } from '../../services/note.service';
import { ActivityService } from '../../services/activity.service';
import { TaskService } from '../../services/task.service';
import { TagService } from '../../services/tag.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import {
  ACTIVITY_ICONS as ACTIVITY_ICON_MAP,
  Activity, Candidate, Note, PIPELINE_STAGES,
  PRIORITY_COLORS as PRIORITY_COLOR_MAP,
  PRIORITY_LABELS as PRIORITY_LABEL_MAP,
  PipelineStage,
  STAGE_COLORS as STAGE_COLOR_MAP,
  STAGE_LABELS as STAGE_LABEL_MAP,
  Tag, Task, TaskPriority
} from '../../models/ats.models';

type DetailTab = 'activity' | 'notes' | 'tasks';

@Component({
  selector: 'app-candidate-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './candidate-detail.component.html',
  styleUrl: './candidate-detail.component.css'
})
export class CandidateDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly candidateService = inject(CandidateService);
  private readonly noteService = inject(NoteService);
  private readonly activityService = inject(ActivityService);
  private readonly taskService = inject(TaskService);
  private readonly tagService = inject(TagService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly candidate = signal<Candidate | null>(null);
  readonly notes = signal<Note[]>([]);
  readonly activities = signal<Activity[]>([]);
  readonly tasks = signal<Task[]>([]);
  readonly allTags = signal<Tag[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly noteDraft = signal('');
  readonly activeTab = signal<DetailTab>('activity');
  readonly showTaskForm = signal(false);
  readonly newTask = signal({ subject: '', priority: 'NORMAL' as TaskPriority, dueAt: '' });

  readonly canWrite = computed(() => this.auth.canWrite());
  readonly stages = PIPELINE_STAGES;
  stageLabel(s: PipelineStage): string { return STAGE_LABEL_MAP[s]; }
  stageColor(s: PipelineStage): string { return STAGE_COLOR_MAP[s]; }
  activityIcon(type: import('../../models/activity.model').ActivityType): string { return ACTIVITY_ICON_MAP[type]; }
  priorityColor(p: TaskPriority): string { return PRIORITY_COLOR_MAP[p]; }
  priorityLabel(p: TaskPriority): string { return PRIORITY_LABEL_MAP[p]; }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!Number.isFinite(id) || id <= 0) {
        this.error.set('Invalid candidate id');
        this.loading.set(false);
        return;
      }
      this.load(id);
    });
  }

  load(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      candidate: this.candidateService.get(id),
      notes: this.noteService.listForCandidate(id),
      activities: this.activityService.forCandidate(id),
      tasks: this.taskService.list({ candidateId: id }),
      tags: this.tagService.listAll()
    }).subscribe({
      next: ({ candidate, notes, activities, tasks, tags }) => {
        this.candidate.set(candidate);
        this.notes.set(notes);
        this.activities.set(activities);
        this.tasks.set(tasks);
        this.allTags.set(tags);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.status === 404 ? 'Candidate not found' : 'Could not load candidate');
        this.loading.set(false);
      }
    });
  }

  setTab(tab: DetailTab): void { this.activeTab.set(tab); }

  parseSkills(skills: string | null | undefined): string[] {
    if (!skills) return [];
    return skills.split(',').map(s => s.trim()).filter(Boolean);
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  saveNote(): void {
    const body = this.noteDraft().trim();
    const candidate = this.candidate();
    if (!body || !candidate) return;
    this.noteService.create({ candidateId: candidate.id, body }).subscribe({
      next: note => {
        this.notes.update(list => [note, ...list]);
        this.noteDraft.set('');
        this.toast.success('Note added');
        if (candidate) this.activityService.forCandidate(candidate.id).subscribe(a => this.activities.set(a));
      },
      error: () => this.toast.error('Could not add note')
    });
  }

  deleteNote(note: Note): void {
    if (!confirm('Delete this note?')) return;
    this.noteService.delete(note.id).subscribe({
      next: () => {
        this.notes.update(list => list.filter(n => n.id !== note.id));
        this.toast.info('Note removed');
      },
      error: () => this.toast.error('Could not delete note')
    });
  }

  moveStage(newStage: PipelineStage): void {
    const candidate = this.candidate();
    if (!candidate || candidate.stage === newStage) return;
    this.candidateService.moveStage(candidate.id, { newStage }).subscribe({
      next: updated => {
        this.candidate.set({ ...candidate, stage: updated.stage });
        this.toast.success(`Moved to ${STAGE_LABEL_MAP[newStage]}`);
        this.activityService.forCandidate(candidate.id).subscribe(a => this.activities.set(a));
      },
      error: () => this.toast.error('Could not move stage')
    });
  }

  toggleTag(tag: Tag): void {
    const candidate = this.candidate();
    if (!candidate) return;
    const currentIds = candidate.tags.map(t => t.id);
    const nextIds = currentIds.includes(tag.id)
      ? currentIds.filter(id => id !== tag.id)
      : [...currentIds, tag.id];
    this.tagService.setTagsForCandidate(candidate.id, nextIds).subscribe({
      next: tags => {
        this.candidate.set({ ...candidate, tags });
        this.activityService.forCandidate(candidate.id).subscribe(a => this.activities.set(a));
      },
      error: () => this.toast.error('Could not update tags')
    });
  }

  hasTag(tag: Tag): boolean {
    return (this.candidate()?.tags ?? []).some(t => t.id === tag.id);
  }

  toggleTaskForm(): void {
    this.showTaskForm.update(v => !v);
  }

  saveTask(): void {
    const candidate = this.candidate();
    const draft = this.newTask();
    if (!candidate || !draft.subject.trim()) return;
    this.taskService.create({
      subject: draft.subject.trim(),
      priority: draft.priority,
      candidateId: candidate.id,
      jobId: candidate.jobId,
      dueAt: draft.dueAt || null
    }).subscribe({
      next: task => {
        this.tasks.update(list => [task, ...list]);
        this.toast.success('Task created');
        this.showTaskForm.set(false);
        this.newTask.set({ subject: '', priority: 'NORMAL', dueAt: '' });
        this.activityService.forCandidate(candidate.id).subscribe(a => this.activities.set(a));
      },
      error: () => this.toast.error('Could not create task')
    });
  }

  updateTaskField<K extends keyof ReturnType<typeof this.newTask>>(key: K, value: ReturnType<typeof this.newTask>[K]): void {
    this.newTask.update(t => ({ ...t, [key]: value }));
  }

  completeTask(task: Task): void {
    this.taskService.updateStatus(task.id, 'DONE').subscribe({
      next: updated => {
        this.tasks.update(list => list.map(t => t.id === task.id ? updated : t));
        this.toast.success('Task completed');
        const candidate = this.candidate();
        if (candidate) this.activityService.forCandidate(candidate.id).subscribe(a => this.activities.set(a));
      },
      error: () => this.toast.error('Could not complete task')
    });
  }

  remove(): void {
    const candidate = this.candidate();
    if (!candidate) return;
    if (!confirm(`Delete ${candidate.firstName} ${candidate.lastName}? This removes notes, activities, and tasks for this candidate.`)) return;
    this.candidateService.delete(candidate.id).subscribe({
      next: () => {
        this.toast.info('Candidate removed');
        this.router.navigate(['/talent']);
      },
      error: () => this.toast.error('Could not delete candidate')
    });
  }

  initials(c: Candidate | null): string {
    if (!c) return '';
    return ((c.firstName?.[0] ?? '') + (c.lastName?.[0] ?? '')).toUpperCase();
  }
}
