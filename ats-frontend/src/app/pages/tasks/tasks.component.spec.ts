import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TasksComponent } from './tasks.component';
import { Task } from '../../models/ats.models';

describe('TasksComponent', () => {
  let httpMock: HttpTestingController;

  const baseTask: Task = {
    id: 1, subject: 'Call Alice', description: '',
    candidateId: 10, candidateName: 'Alice', jobId: 1, jobTitle: 'Eng',
    assigneeId: 5, assigneeName: 'Other', creatorId: 5, creatorName: 'Other',
    priority: 'HIGH', status: 'OPEN',
    dueAt: '2030-01-01T12:00:00Z', createdAt: '2026-01-01', updatedAt: '2026-01-01', completedAt: null
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TasksComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('renders empty state when no tasks', () => {
    const fixture = TestBed.createComponent(TasksComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/tasks').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tasks here');
  });

  it('renders task rows', () => {
    const fixture = TestBed.createComponent(TasksComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/tasks').flush([baseTask]);
    fixture.componentInstance.setFilter('all');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Call Alice');
  });

  it('dueLabel marks future, today, past', () => {
    const fixture = TestBed.createComponent(TasksComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/tasks').flush([]);
    const c = fixture.componentInstance;
    expect(c.dueLabel({ ...baseTask, dueAt: null }).tone).toBe('none');
    expect(c.dueLabel({ ...baseTask, dueAt: '2030-01-01T00:00:00Z' }).tone).toBe('future');
    expect(c.dueLabel({ ...baseTask, dueAt: '2010-01-01T00:00:00Z' }).tone).toBe('past');
    const today = new Date(); today.setHours(20, 0, 0, 0);
    expect(c.dueLabel({ ...baseTask, dueAt: today.toISOString() }).tone).toBe('today');
  });

  it('counts mine/open/overdue/done/all', () => {
    const fixture = TestBed.createComponent(TasksComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/tasks').flush([
      { ...baseTask, id: 1, status: 'OPEN', dueAt: '2010-01-01' },
      { ...baseTask, id: 2, status: 'DONE' },
      { ...baseTask, id: 3, status: 'OPEN', dueAt: '2030-01-01' }
    ]);
    fixture.detectChanges();
    const c = fixture.componentInstance.counts();
    expect(c.all).toBe(3);
    expect(c.open).toBe(2);
    expect(c.overdue).toBe(1);
    expect(c.done).toBe(1);
  });
});
