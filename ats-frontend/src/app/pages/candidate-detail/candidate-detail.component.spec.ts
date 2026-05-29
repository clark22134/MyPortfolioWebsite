import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
declare const vi: typeof import('vitest').vi;
import { CandidateDetailComponent } from './candidate-detail.component';
import { AuthService } from '../../services/auth.service';
import { Activity, Candidate, Note, Tag, Task } from '../../models/ats.models';

describe('CandidateDetailComponent', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;

  const candidate: Candidate = {
    id: 10, firstName: 'Alice', lastName: 'Smith', email: 'a@b.com',
    phone: '555', resumeUrl: '/resumes/a.pdf', notes: '', skills: 'Java,Docker',
    address: '100 Main', latitude: null, longitude: null, lastAssignmentDays: 365,
    stage: 'APPLIED', stageOrder: 0, jobId: 1, jobTitle: 'Eng', talentPool: false,
    tags: [{ id: 1, name: 'Top Pick', color: '#22c55e' }],
    appliedAt: '2026-01-01', updatedAt: '2026-01-01'
  };
  const note: Note = { id: 1, candidateId: 10, authorId: 1, authorName: 'Rec', body: 'Strong fit', createdAt: '2026-01-01', updatedAt: '2026-01-01' };
  const activity: Activity = {
    id: 1, type: 'STAGE_CHANGED', candidateId: 10, candidateName: 'Alice Smith',
    jobId: 1, jobTitle: 'Eng', actorId: 1, actorName: 'Rec',
    summary: 'Moved', metadata: null, createdAt: '2026-01-01'
  };
  const task: Task = {
    id: 1, subject: 'Call Alice', description: '',
    candidateId: 10, candidateName: 'Alice Smith', jobId: 1, jobTitle: 'Eng',
    assigneeId: 1, assigneeName: 'Rec', creatorId: 1, creatorName: 'Rec',
    priority: 'NORMAL', status: 'OPEN', dueAt: null,
    createdAt: '2026-01-01', updatedAt: '2026-01-01', completedAt: null
  };
  const allTags: Tag[] = [
    { id: 1, name: 'Top Pick', color: '#22c55e' },
    { id: 2, name: 'Referral', color: '#3b82f6' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '10' })) } }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth['_currentUser'].set({
      id: 1, username: 'rec', email: 'a@b.com', fullName: 'Rec',
      role: 'RECRUITER', enabled: true, createdAt: '2026-01-01', lastLoginAt: null
    });
  });

  afterEach(() => httpMock.verify());

  function fulfillLoad(opts: { notes?: Note[]; activities?: Activity[]; tasks?: Task[]; tags?: Tag[] } = {}): void {
    httpMock.expectOne('/api/candidates/10').flush(candidate);
    httpMock.expectOne('/api/notes?candidateId=10').flush(opts.notes ?? []);
    httpMock.expectOne('/api/activities?candidateId=10').flush(opts.activities ?? []);
    httpMock.expectOne(r => r.url === '/api/tasks' && r.params.get('candidateId') === '10').flush(opts.tasks ?? []);
    httpMock.expectOne('/api/tags').flush(opts.tags ?? []);
  }

  it('loads candidate + sections', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    fulfillLoad({ notes: [note], activities: [activity], tasks: [task], tags: allTags });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Alice Smith');
    expect(fixture.nativeElement.textContent).toContain('Top Pick');
  });

  it('invalid id shows error', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CandidateDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'abc' })) } }
      ]
    });
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toContain('Invalid');
  });

  it('parseSkills splits comma list', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    expect(fixture.componentInstance.parseSkills('Java, Docker , AWS')).toEqual(['Java', 'Docker', 'AWS']);
    expect(fixture.componentInstance.parseSkills(null)).toEqual([]);
    httpMock.match(() => true).forEach(r => r.flush([]));
  });

  it('saveNote posts to API and refreshes activity', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    fulfillLoad();
    fixture.componentInstance.noteDraft.set('Hello');
    fixture.componentInstance.saveNote();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/notes').flush(note);
    httpMock.expectOne('/api/activities?candidateId=10').flush([]);
    expect(fixture.componentInstance.notes().length).toBe(1);
  });

  it('moveStage to a different stage triggers PATCH and activity refresh', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    fulfillLoad();
    fixture.componentInstance.moveStage('SCREENING');
    const stage = httpMock.expectOne('/api/candidates/10/stage');
    expect(stage.request.method).toBe('PATCH');
    stage.flush({ ...candidate, stage: 'SCREENING' });
    httpMock.expectOne('/api/activities?candidateId=10').flush([]);
    expect(fixture.componentInstance.candidate()?.stage).toBe('SCREENING');
  });

  it('moveStage to current stage does nothing', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    fulfillLoad();
    fixture.componentInstance.moveStage('APPLIED');
    httpMock.verify();
    expect(fixture.componentInstance.candidate()?.stage).toBe('APPLIED');
  });

  it('toggleTag adds and refreshes activity', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    fulfillLoad({ tags: allTags });
    fixture.componentInstance.toggleTag(allTags[1]);
    const set = httpMock.expectOne('/api/tags/candidate/10');
    expect(set.request.method).toBe('PUT');
    set.flush(allTags);
    httpMock.expectOne('/api/activities?candidateId=10').flush([]);
  });

  it('hasTag detects current tags', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    fulfillLoad({ tags: allTags });
    const c = fixture.componentInstance;
    expect(c.hasTag(allTags[0])).toBe(true);
    expect(c.hasTag(allTags[1])).toBe(false);
  });

  it('saveTask posts and refreshes activity', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    fulfillLoad();
    fixture.componentInstance.newTask.set({ subject: 'Ping Alice', priority: 'HIGH', dueAt: '' });
    fixture.componentInstance.saveTask();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/tasks').flush(task);
    httpMock.expectOne('/api/activities?candidateId=10').flush([]);
    expect(fixture.componentInstance.tasks().length).toBe(1);
  });

  it('completeTask updates status', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    fulfillLoad({ tasks: [task] });
    fixture.componentInstance.completeTask(task);
    httpMock.expectOne('/api/tasks/1/status').flush({ ...task, status: 'DONE' });
    httpMock.expectOne('/api/activities?candidateId=10').flush([]);
    expect(fixture.componentInstance.tasks()[0].status).toBe('DONE');
  });

  it('setTab switches active tab', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    fulfillLoad();
    fixture.componentInstance.setTab('notes');
    expect(fixture.componentInstance.activeTab()).toBe('notes');
    fixture.componentInstance.setTab('tasks');
    expect(fixture.componentInstance.activeTab()).toBe('tasks');
  });

  it('renders activity, notes, and tasks tab content', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    fulfillLoad({ notes: [note], activities: [activity], tasks: [task], tags: allTags });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Moved');
    fixture.componentInstance.setTab('notes');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Strong fit');
    fixture.componentInstance.setTab('tasks');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Call Alice');
  });

  it('deleteNote sends DELETE on confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    fulfillLoad({ notes: [note] });
    fixture.componentInstance.deleteNote(note);
    httpMock.expectOne('/api/notes/1').flush(null);
    expect(fixture.componentInstance.notes().length).toBe(0);
  });

  it('formatDate returns dash for null', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    fulfillLoad();
    expect(fixture.componentInstance.formatDate(null)).toBe('—');
    expect(fixture.componentInstance.formatDate('2026-01-15T00:00:00Z')).toContain('2026');
  });

  it('toggleTaskForm flips visibility', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    fulfillLoad();
    expect(fixture.componentInstance.showTaskForm()).toBe(false);
    fixture.componentInstance.toggleTaskForm();
    expect(fixture.componentInstance.showTaskForm()).toBe(true);
  });

  it('updateTaskField updates a field', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    fixture.detectChanges();
    fulfillLoad();
    fixture.componentInstance.updateTaskField('subject', 'New subject');
    expect(fixture.componentInstance.newTask().subject).toBe('New subject');
  });

  it('initials computes from first + last name', () => {
    const fixture = TestBed.createComponent(CandidateDetailComponent);
    expect(fixture.componentInstance.initials(candidate)).toBe('AS');
    expect(fixture.componentInstance.initials(null)).toBe('');
    httpMock.match(() => true).forEach(r => r.flush([]));
  });
});
