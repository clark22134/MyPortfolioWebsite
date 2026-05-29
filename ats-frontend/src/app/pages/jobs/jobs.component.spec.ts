import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { JobsComponent } from './jobs.component';
import { AuthService } from '../../services/auth.service';
import { Job } from '../../models/ats.models';

describe('JobsComponent', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;

  const mkJob = (overrides: Partial<Job> = {}): Job => ({
    id: 1, employer: 'Acme', title: 'Senior Engineer', department: 'Engineering',
    location: 'Remote', description: 'Build things', requiredSkills: 'Java, Spring',
    address: '100 Pine St', latitude: 37.79, longitude: -122.40,
    status: 'OPEN', employmentType: 'FULL_TIME', candidateCount: 5,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth['_currentUser'].set({
      id: 1, username: 'admin', email: 'a@b.com', fullName: 'Admin',
      role: 'ADMIN', enabled: true, createdAt: '2026-01-01', lastLoginAt: null
    });
  });

  afterEach(() => httpMock.verify());

  it('groups jobs by employer', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([
      mkJob({ id: 1, employer: 'Acme' }),
      mkJob({ id: 2, employer: 'Acme', title: 'DevOps' }),
      mkJob({ id: 3, employer: 'Pixel', title: 'Designer' })
    ]);
    fixture.detectChanges();
    expect(fixture.componentInstance.employerGroups.length).toBe(2);
  });

  it('toggleOpenOnly flips the flag', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([mkJob({ status: 'OPEN' }), mkJob({ id: 2, status: 'CLOSED' })]);
    fixture.detectChanges();
    fixture.componentInstance.toggleOpenOnly();
    expect(fixture.componentInstance.showOpenOnly).toBe(true);
  });

  it('renders empty state when no jobs', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No jobs yet');
  });

  it('editJob populates form fields', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    fixture.detectChanges();
    const job = mkJob();
    httpMock.expectOne('/api/jobs').flush([job]);
    fixture.componentInstance.editJob(job);
    expect(fixture.componentInstance.form.title).toBe('Senior Engineer');
    expect(fixture.componentInstance.showForm).toBe(true);
  });

  it('toggleTopMatches collapses on second click', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([mkJob()]);
    fixture.componentInstance.toggleTopMatches(1);
    httpMock.expectOne('/api/jobs/1/top-candidates').flush([]);
    expect(fixture.componentInstance.expandedJobId).toBe(1);
    fixture.componentInstance.toggleTopMatches(1);
    expect(fixture.componentInstance.expandedJobId).toBeNull();
  });

  it('parseSkills splits trimmed list', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([]);
    expect(fixture.componentInstance.parseSkills('Java, Docker , AWS')).toEqual(['Java', 'Docker', 'AWS']);
    expect(fixture.componentInstance.parseSkills('')).toEqual([]);
  });

  it('openJobDetail / closeJobDetail toggle selectedJob', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    fixture.detectChanges();
    const job = mkJob();
    httpMock.expectOne('/api/jobs').flush([job]);
    fixture.componentInstance.openJobDetail(job);
    expect(fixture.componentInstance.selectedJob).toBe(job);
    fixture.componentInstance.closeJobDetail();
    expect(fixture.componentInstance.selectedJob).toBeNull();
  });

  it('saveJob creates and reloads', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([]);
    const c = fixture.componentInstance;
    c.form = { employer: 'Acme', title: 'New', department: 'Eng', location: 'R',
               description: '', requiredSkills: '', address: '', latitude: null, longitude: null,
               status: 'OPEN', employmentType: 'FULL_TIME' };
    c.saveJob();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/jobs').flush(mkJob({ id: 9, title: 'New' }));
    httpMock.expectOne('/api/jobs').flush([mkJob({ id: 9 })]);
  });

  it('saveJob updates when editingId set', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([]);
    const c = fixture.componentInstance;
    c.editingId = 5;
    c.form = { employer: 'Acme', title: 'Edit', department: 'Eng', location: 'R',
               description: '', requiredSkills: '', address: '', latitude: null, longitude: null,
               status: 'OPEN', employmentType: 'FULL_TIME' };
    c.saveJob();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/jobs/5').flush(mkJob({ id: 5 }));
    httpMock.expectOne('/api/jobs').flush([]);
  });

  it('formatType / formatDate produce friendly strings', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([]);
    expect(fixture.componentInstance.formatType('FULL_TIME').toLowerCase()).toBe('full time');
    expect(fixture.componentInstance.formatDate('2026-01-15T00:00:00Z')).toContain('2026');
  });

  it('jobsPageNumbers computes pagination model', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    fixture.detectChanges();
    const many = Array.from({ length: 20 }, (_, i) => mkJob({ id: i + 1, employer: 'E' + i }));
    httpMock.expectOne('/api/jobs').flush(many);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.goToJobsPage(3);
    expect(c.jobsPageNumbers).toContain(3);
  });

  it('pagination helpers work', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    fixture.detectChanges();
    const many = Array.from({ length: 12 }, (_, i) => mkJob({ id: i + 1, employer: 'E' + i }));
    httpMock.expectOne('/api/jobs').flush(many);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.jobsTotalPages).toBeGreaterThan(1);
    c.goToJobsPage(2);
    expect(c.jobsPage).toBe(2);
    c.prevJobsPage();
    expect(c.jobsPage).toBe(1);
  });
});
