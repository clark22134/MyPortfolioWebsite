import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import {
  PRIORITY_COLORS as PRIORITY_COLOR_MAP, PRIORITY_LABELS as PRIORITY_LABEL_MAP,
  Task, TaskPriority, TaskRequest, TaskStatus
} from '../../models/ats.models';

type TaskFilter = 'mine' | 'open' | 'overdue' | 'done' | 'all';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css'
})
export class TasksComponent implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly tasks = signal<Task[]>([]);
  readonly loading = signal(true);
  readonly filter = signal<TaskFilter>('mine');
  readonly creating = signal(false);
  readonly newTask = signal<TaskRequest>({ subject: '', description: '', priority: 'NORMAL' });

  readonly canWrite = computed(() => this.auth.canWrite());
  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  priorityColor(p: TaskPriority): string { return PRIORITY_COLOR_MAP[p]; }
  priorityLabel(p: TaskPriority): string { return PRIORITY_LABEL_MAP[p]; }
  readonly priorities: TaskPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

  readonly visibleTasks = computed(() => {
    const filter = this.filter();
    const list = this.tasks();
    const now = Date.now();
    switch (filter) {
      case 'mine': return list.filter(t => t.assigneeId === this.currentUserId());
      case 'open': return list.filter(t => t.status === 'OPEN');
      case 'overdue': return list.filter(t => t.status === 'OPEN' && t.dueAt && new Date(t.dueAt).getTime() < now);
      case 'done': return list.filter(t => t.status === 'DONE');
      default: return list;
    }
  });

  readonly counts = computed(() => {
    const list = this.tasks();
    const now = Date.now();
    const mine = list.filter(t => t.assigneeId === this.currentUserId()).length;
    const open = list.filter(t => t.status === 'OPEN').length;
    const overdue = list.filter(t => t.status === 'OPEN' && t.dueAt && new Date(t.dueAt).getTime() < now).length;
    const done = list.filter(t => t.status === 'DONE').length;
    return { mine, open, overdue, done, all: list.length };
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.taskService.list().subscribe({
      next: tasks => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load tasks');
      }
    });
  }

  setFilter(filter: TaskFilter): void {
    this.filter.set(filter);
  }

  toggleCreate(): void {
    this.creating.update(v => !v);
    if (!this.creating()) {
      this.newTask.set({ subject: '', description: '', priority: 'NORMAL' });
    }
  }

  updateNewTask<K extends keyof TaskRequest>(key: K, value: TaskRequest[K]): void {
    this.newTask.update(t => ({ ...t, [key]: value }));
  }

  saveNew(): void {
    const draft = this.newTask();
    if (!draft.subject.trim()) {
      this.toast.warning('Subject is required');
      return;
    }
    this.taskService.create(draft).subscribe({
      next: created => {
        this.tasks.update(list => [created, ...list]);
        this.toast.success('Task created');
        this.creating.set(false);
        this.newTask.set({ subject: '', description: '', priority: 'NORMAL' });
      },
      error: err => this.toast.error('Could not create task', err?.error?.error ?? '')
    });
  }

  setStatus(task: Task, status: TaskStatus): void {
    this.taskService.updateStatus(task.id, status).subscribe({
      next: updated => {
        this.tasks.update(list => list.map(t => t.id === task.id ? updated : t));
        this.toast.success(status === 'DONE' ? 'Task completed' : status === 'OPEN' ? 'Task reopened' : 'Task cancelled');
      },
      error: () => this.toast.error('Could not update task')
    });
  }

  remove(task: Task): void {
    if (!confirm(`Delete task "${task.subject}"?`)) return;
    this.taskService.delete(task.id).subscribe({
      next: () => {
        this.tasks.update(list => list.filter(t => t.id !== task.id));
        this.toast.info('Task removed');
      },
      error: () => this.toast.error('Could not delete task')
    });
  }

  dueLabel(task: Task): { text: string; tone: 'past' | 'today' | 'future' | 'none' } {
    if (!task.dueAt) return { text: 'No due date', tone: 'none' };
    const due = new Date(task.dueAt);
    const now = new Date();
    const sameDay = due.toDateString() === now.toDateString();
    if (due.getTime() < now.getTime() && !sameDay) {
      return { text: `Overdue · ${due.toLocaleDateString()}`, tone: 'past' };
    }
    if (sameDay) return { text: `Today · ${due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, tone: 'today' };
    return { text: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), tone: 'future' };
  }
}
