import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { JobsComponent } from './jobs.component';
import { Job } from '../../models/ats.models';

describe('JobsComponent', () => {
  let httpMock: HttpTestingController;

  const mockJobs: Job[] = [
    {
      id: 1,
      employer: 'Acme Corp',
      title: 'Software Engineer',
      department: 'Engineering',
      location: 'Remote',
      description: 'Build stuff',
      requiredSkills: 'Java, Spring Boot',
      address: '',
      latitude: null,
      longitude: null,
      status: 'OPEN',
      employmentType: 'FULL_TIME',
      candidateCount: 5,
      createdAt: '2025-01-15T00:00:00',
      updatedAt: '2025-01-15T00:00:00'
    },
    {
      id: 2,
      employer: 'Acme Corp',
      title: 'DevOps Engineer',
      department: 'Infrastructure',
      location: 'Seattle, WA',
      description: 'Deploy stuff',
      requiredSkills: 'Docker, Terraform',
      address: '',
      latitude: null,
      longitude: null,
      status: 'CLOSED',
      employmentType: 'FULL_TIME',
      candidateCount: 3,
      createdAt: '2025-02-01T00:00:00',
      updatedAt: '2025-02-01T00:00:00'
    },
    {
      id: 3,
      employer: 'TechStart',
      title: 'Frontend Developer',
      department: 'Product',
      location: 'Austin, TX',
      description: 'UI work',
      requiredSkills: 'Angular, TypeScript',
      address: '',
      latitude: null,
      longitude: null,
      status: 'OPEN',
      employmentType: 'CONTRACT',
      candidateCount: 2,
      createdAt: '2025-03-01T00:00:00',
      updatedAt: '2025-03-01T00:00:00'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);
  });

  it('should load jobs on init', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/jobs');
    req.flush(mockJobs);

    expect(component.jobs.length).toBe(3);
  });

  it('should group jobs by employer', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/jobs').flush(mockJobs);

    expect(component.employerGroups.length).toBe(2);
    const acme = component.employerGroups.find(g => g.employer === 'Acme Corp');
    expect(acme).toBeTruthy();
    expect(acme!.jobs.length).toBe(2);
  });

  it('should count open jobs', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/jobs').flush(mockJobs);

    expect(component.openJobCount).toBe(2);
  });

  it('should format employment type', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    expect(component.formatType('FULL_TIME')).toBe('FULL TIME');
    expect(component.formatType('PART_TIME')).toBe('PART TIME');
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([]);
  });

  it('should toggle showOpenOnly filter', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    expect(component.showOpenOnly).toBe(false);
    component.toggleOpenOnly();
    expect(component.showOpenOnly).toBe(true);
  });

  it('should parse skills from comma-separated string', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    expect(component.parseSkills('Java, Spring Boot, Docker')).toEqual(['Java', 'Spring Boot', 'Docker']);
    expect(component.parseSkills('')).toEqual([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([]);
  });

  it('should handle empty jobs list', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/jobs').flush([]);

    expect(component.jobs.length).toBe(0);
    expect(component.employerGroups.length).toBe(0);
  });

  it('should start with showForm false', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    expect(component.showForm).toBe(false);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([]);
  });

  it('should handle loadJobs error gracefully', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush('Server error', { status: 500, statusText: 'Server Error' });
    expect(component.loading).toBe(false);
  });

  it('should format date string', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    const result = component.formatDate('2025-01-15T00:00:00');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([]);
  });

  it('should open edit form with job data', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    component.editJob(mockJobs[0]);
    expect(component.editingId).toBe(1);
    expect(component.form.title).toBe('Software Engineer');
    expect(component.showForm).toBe(true);
  });

  it('should create new job via saveJob', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([]);

    component.showForm = true;
    component.saveJob();

    const createReq = httpMock.expectOne(req => req.method === 'POST' && req.url === '/api/jobs');
    createReq.flush(mockJobs[0]);

    // reloads after save
    httpMock.expectOne('/api/jobs').flush([]);
    expect(component.showForm).toBe(false);
  });

  it('should update existing job via saveJob', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    component.editJob(mockJobs[0]);
    component.saveJob();

    const updateReq = httpMock.expectOne(req => req.method === 'PUT' && req.url === '/api/jobs/1');
    updateReq.flush(mockJobs[0]);

    httpMock.expectOne('/api/jobs').flush(mockJobs);
    expect(component.editingId).toBeNull();
  });

  it('should delete job when confirmed', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    component.deleteJob(1);

    const deleteReq = httpMock.expectOne(req => req.method === 'DELETE' && req.url === '/api/jobs/1');
    deleteReq.flush(null);
    httpMock.expectOne('/api/jobs').flush([]);
  });

  it('should not delete job when confirm cancelled', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    component.deleteJob(1);
    httpMock.expectNone(req => req.method === 'DELETE');
  });

  it('should load top candidates when toggleTopMatches called', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    component.toggleTopMatches(1);
    expect(component.expandedJobId).toBe(1);

    const matchReq = httpMock.expectOne('/api/jobs/1/top-candidates');
    matchReq.flush([{ candidateId: 10, score: 0.9, firstName: 'Alice', lastName: 'J', skills: 'Java' }]);
    expect(component.topMatches.length).toBe(1);
    expect(component.loadingMatches).toBe(false);
  });

  it('should collapse top candidates on second toggleTopMatches', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    component.expandedJobId = 1;
    component.toggleTopMatches(1);
    expect(component.expandedJobId).toBeNull();
    expect(component.topMatches).toEqual([]);
  });

  it('should filter displayed jobs by open status', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    component.showOpenOnly = true;
    const acmeGroup = component.employerGroups.find(g => g.employer === 'Acme Corp')!;
    const displayed = component.displayedJobs(acmeGroup);
    expect(displayed.every(j => j.status === 'OPEN')).toBe(true);
    expect(displayed.length).toBe(1);
  });

  it('should return all jobs in group when showOpenOnly is false', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    const acmeGroup = component.employerGroups.find(g => g.employer === 'Acme Corp')!;
    const displayed = component.displayedJobs(acmeGroup);
    expect(displayed.length).toBe(2);
  });

  it('should compute jobsTotalPages', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);
    expect(component.jobsTotalPages).toBe(1);
  });

  it('should navigate pages with prevJobsPage and nextJobsPage', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    component.jobsPage = 2;
    component.prevJobsPage();
    expect(component.jobsPage).toBe(1);
    component.nextJobsPage();
    expect(component.jobsPage).toBe(1); // already at max
  });

  it('should open and close job detail', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    component.openJobDetail(mockJobs[0]);
    expect(component.selectedJob).toBeTruthy();

    component.closeJobDetail();
    expect(component.selectedJob).toBeNull();
  });

  it('should return jobsPageNumbers for small page count', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);
    const pages = component.jobsPageNumbers;
    expect(Array.isArray(pages)).toBe(true);
    expect(pages.length).toBeGreaterThan(0);
  });

  it('should render create form when showForm is true', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    component.showForm = true;
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('form')).toBeTruthy();
  });

  it('should render edit form when editing a job', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    component.editJob(mockJobs[0]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('form')).toBeTruthy();
  });

  it('should render job detail modal when selectedJob is set', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    component.openJobDetail(mockJobs[0]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[aria-label="Job Details"]')).toBeTruthy();
  });

  it('should render top matches section when expanded', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    component.expandedJobId = 1;
    component.topMatches = [{
      candidateId: 1, firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com',
      skillsMatchPercent: 80, daysWorkedScore: 5, distanceMiles: 10,
      matchedSkills: ['Java'], candidateSkills: ['Java', 'Spring']
    }];
    component.loadingMatches = false;
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toBeTruthy();
  });

  it('should render loading state for top matches', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    component.expandedJobId = 1;
    component.loadingMatches = true;
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toBeTruthy();
  });
});
