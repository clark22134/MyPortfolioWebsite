import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TalentComponent } from './talent.component';
import { Candidate, Job } from '../../models/ats.models';

describe('TalentComponent', () => {
  let httpMock: HttpTestingController;

  const mockJobs: Job[] = [
    {
      id: 1,
      employer: 'Acme Corp',
      title: 'Software Engineer',
      department: 'Engineering',
      location: 'Remote',
      description: '',
      requiredSkills: '',
      address: '',
      latitude: null,
      longitude: null,
      status: 'OPEN',
      employmentType: 'FULL_TIME',
      candidateCount: 2,
      createdAt: '2025-01-01T00:00:00',
      updatedAt: '2025-01-01T00:00:00'
    }
  ];

  const mockCandidates: Candidate[] = [
    {
      id: 1,
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@test.com',
      phone: '555-0001',
      resumeUrl: '',
      notes: '',
      skills: 'Java, Python',
      address: '',
      latitude: null,
      longitude: null,
      lastAssignmentDays: 0,
      stage: 'APPLIED',
      stageOrder: 0,
      jobId: 1,
      jobTitle: 'Software Engineer',
      talentPool: false,
      appliedAt: '2025-01-10T00:00:00',
      updatedAt: '2025-01-10T00:00:00'
    },
    {
      id: 2,
      firstName: 'Bob',
      lastName: 'Williams',
      email: 'bob@test.com',
      phone: '555-0002',
      resumeUrl: '',
      notes: '',
      skills: 'Docker, AWS',
      address: '',
      latitude: null,
      longitude: null,
      lastAssignmentDays: 0,
      stage: 'SCREENING',
      stageOrder: 0,
      jobId: 1,
      jobTitle: 'Software Engineer',
      talentPool: false,
      appliedAt: '2025-01-12T00:00:00',
      updatedAt: '2025-01-12T00:00:00'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TalentComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushInitialRequests(): void {
    httpMock.expectOne('/api/jobs').flush(mockJobs);
    httpMock.expectOne(req => req.url === '/api/candidates/search' && req.method === 'GET').flush(mockCandidates);
  }

  it('should create', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    fixture.detectChanges();
    flushInitialRequests();
  });

  it('should load candidates on init', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    expect(component.candidates.length).toBe(2);
  });

  it('should load jobs on init', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    expect(component.jobs.length).toBe(1);
  });

  it('should parse skills', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    expect(component.parseSkills('Java, Docker, AWS')).toEqual(['Java', 'Docker', 'AWS']);
    expect(component.parseSkills('')).toEqual([]);
    fixture.detectChanges();
    flushInitialRequests();
  });

  it('should detect active filters', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    expect(component.hasActiveFilter()).toBe(false);
    component.filters.name = 'Alice';
    expect(component.hasActiveFilter()).toBe(true);
  });

  it('should start on page 1', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    expect(component.page).toBe(1);
    fixture.detectChanges();
    flushInitialRequests();
  });

  it('should return stage labels', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    expect(component.stageLabel('APPLIED')).toBeTruthy();
    expect(component.stageLabel('SCREENING')).toBeTruthy();
    fixture.detectChanges();
    flushInitialRequests();
  });

  it('should format file size', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    expect(component.formatFileSize(500)).toBe('500 B');
    expect(component.formatFileSize(2048)).toBe('2.0 KB');
    expect(component.formatFileSize(1048576)).toBe('1.0 MB');
    fixture.detectChanges();
    flushInitialRequests();
  });

  it('should start with modals closed', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    expect(component.showAddModal).toBe(false);
    expect(component.showUploadModal).toBe(false);
    fixture.detectChanges();
    flushInitialRequests();
  });

  it('should open and close add modal', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.openAdd();
    expect(component.showAddModal).toBe(true);
    expect(component.addForm['stage']).toBe('APPLIED');

    component.closeAdd();
    expect(component.showAddModal).toBe(false);
  });

  it('should open and close upload modal', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.openUpload();
    expect(component.showUploadModal).toBe(true);

    component.closeUpload();
    expect(component.showUploadModal).toBe(false);
  });

  it('should not close upload modal while uploading', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.openUpload();
    component.uploading = true;
    component.closeUpload();
    expect(component.showUploadModal).toBe(true);
  });

  it('should open and close candidate detail', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.openCandidateDetail(mockCandidates[0]);
    expect(component.selectedCandidate).toBe(mockCandidates[0]);

    component.closeCandidateDetail();
    expect(component.selectedCandidate).toBeNull();
  });

  it('should open and close edit modal with candidate data', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.openEdit(mockCandidates[0]);
    expect(component.editingCandidate).toBe(mockCandidates[0]);
    expect(component.editForm['firstName']).toBe('Alice');

    component.closeEdit();
    expect(component.editingCandidate).toBeNull();
  });

  it('should save edit and reload candidates', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.openEdit(mockCandidates[0]);
    component.saveEdit();

    const putReq = httpMock.expectOne(req => req.method === 'PUT' && req.url.startsWith('/api/candidates/'));
    putReq.flush(mockCandidates[0]);
    httpMock.expectOne(req => req.url === '/api/candidates/search').flush([]);
  });

  it('should save add and reload candidates', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.openAdd();
    component.addForm = {
      firstName: 'New', lastName: 'Person', email: 'new@test.com',
      phone: '555-9999', skills: 'Java', stage: 'APPLIED', jobId: 1
    };
    component.saveAdd();

    const postReq = httpMock.expectOne(req => req.method === 'POST' && req.url === '/api/candidates');
    postReq.flush(mockCandidates[0]);
    httpMock.expectOne(req => req.url === '/api/candidates/search').flush([]);
  });

  it('should filterBySkill adding a skill', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.filterBySkill('Java');
    expect(component.filters.skills).toContain('Java');
    // Flush the new search triggered by filterBySkill
    httpMock.expectOne(req => req.url === '/api/candidates/search').flush([]);
  });

  it('should filterBySkill removing an existing skill', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.filters.skills = 'Java, Docker';
    component.filterBySkill('Java');
    expect(component.filters.skills).not.toContain('Java');
    httpMock.expectOne(req => req.url === '/api/candidates/search').flush([]);
  });

  it('should isSkillMatch return true when skill matches filter', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.filters.skills = 'Java, Docker';
    expect(component.isSkillMatch('Java')).toBe(true);
    expect(component.isSkillMatch('Python')).toBe(false);
    expect(component.isSkillMatch('JAVA')).toBe(true); // case-insensitive
  });

  it('should isSkillMatch return false when no skills filter', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    expect(component.isSkillMatch('Java')).toBe(false);
  });

  it('should resetFilters and reload', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.filters.name = 'Alice';
    component.resetFilters();
    expect(component.filters.name).toBe('');
    httpMock.expectOne(req => req.url === '/api/candidates/search').flush([]);
  });

  it('should clearField and reload', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.filters.name = 'Alice';
    component.clearField('name');
    expect(component.filters.name).toBe('');
    httpMock.expectOne(req => req.url === '/api/candidates/search').flush([]);
  });

  it('should return stageColor and stageBg', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    expect(component.stageColor('APPLIED')).toBeTruthy();
    expect(component.stageBg('APPLIED')).toContain('#');
  });

  it('should formatDate', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    const result = component.formatDate('2025-01-10T00:00:00');
    expect(result).toContain('Jan');
  });

  it('should handle runSearch error gracefully', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/jobs').flush(mockJobs);
    httpMock.expectOne(req => req.url === '/api/candidates/search').flush(
      'error', { status: 500, statusText: 'Server Error' }
    );

    expect(component.loading).toBe(false);
  });

  it('should compute pagedCandidates', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    expect(component.pagedCandidates.length).toBe(2);
  });

  it('should compute totalPages', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    expect(component.totalPages).toBe(1);
  });

  it('should navigate pages with prevPage/nextPage', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.page = 2;
    component.prevPage();
    expect(component.page).toBe(1);
    component.nextPage(); // would go to 2, but only 2 candidates < pageSize=12
    expect(component.page).toBe(1);
  });

  it('should return pageNumbers array', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    const pages = component.pageNumbers;
    expect(Array.isArray(pages)).toBe(true);
    expect(pages.length).toBeGreaterThan(0);
  });

  it('should goToPage', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.goToPage(1);
    expect(component.page).toBe(1);

    component.goToPage('2');
    expect(component.page).toBe(2);
  });

  it('should handle onFileChange', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    const mockFile = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
    const mockInput = { files: [mockFile] } as unknown as HTMLInputElement;
    const event = { target: mockInput } as unknown as Event;

    component.onFileChange(event);
    expect(component.uploadFile).toBe(mockFile);
    expect(component.uploadError).toBeNull();
  });

  it('should handle onDragOver preventing default', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    let defaultPrevented = false;
    const event = { preventDefault: () => { defaultPrevented = true; } } as unknown as DragEvent;
    component.onDragOver(event);
    expect(defaultPrevented).toBe(true);
  });

  it('should handle onDrop setting uploadFile', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    const mockFile = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
    const event = {
      preventDefault: () => {},
      dataTransfer: { files: [mockFile] }
    } as unknown as DragEvent;
    component.onDrop(event);
    expect(component.uploadFile).toBe(mockFile);
  });

  it('should submitUpload success path', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.openUpload();
    component.uploadFile = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
    component.submitUpload();

    const uploadReq = httpMock.expectOne(req => req.method === 'POST' && req.url === '/api/talent-pool/upload');
    uploadReq.flush({ message: 'ok' });

    httpMock.expectOne(req => req.url === '/api/candidates/search').flush([]);
    expect(component.uploading).toBe(false);
    expect(component.showUploadModal).toBe(false);
  });

  it('should submitUpload error path', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.openUpload();
    component.uploadFile = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
    component.submitUpload();

    const uploadReq = httpMock.expectOne(req => req.method === 'POST' && req.url === '/api/talent-pool/upload');
    uploadReq.flush({ error: 'Unsupported type' }, { status: 400, statusText: 'Bad Request' });

    expect(component.uploading).toBe(false);
    expect(component.uploadError).toBeTruthy();
  });

  it('should not submitUpload when no file selected', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.uploadFile = null;
    component.submitUpload();
    httpMock.expectNone(req => req.method === 'POST' && req.url === '/api/talent-pool/upload');
  });

  it('should deleteCandidate when confirmed', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fixture.detectChanges();
    flushInitialRequests();

    component.deleteCandidate(1);
    const req = httpMock.expectOne(req => req.method === 'DELETE' && req.url === '/api/candidates/1');
    req.flush(null);
    httpMock.expectOne(req => req.url === '/api/candidates/search').flush([]);
  });

  it('should not deleteCandidate when confirm cancelled', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fixture.detectChanges();
    flushInitialRequests();

    component.deleteCandidate(1);
    httpMock.expectNone(req => req.method === 'DELETE');
  });

  it('should complete destroy subject on ngOnDestroy', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  it('should render add modal template when open', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.openAdd();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[aria-label="Add Candidate"]')).toBeTruthy();
  });

  it('should render upload modal template when open', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.openUpload();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[aria-label="Upload Resume"]')).toBeTruthy();
  });

  it('should render upload modal with file selected', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.openUpload();
    component.uploadFile = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
    component.uploadError = 'File too large';
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[aria-label="Upload Resume"]')).toBeTruthy();
  });

  it('should render edit modal template when editing', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.openEdit(mockCandidates[0]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[aria-label="Edit Candidate"]')).toBeTruthy();
  });

  it('should render candidate detail template when selected', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.openCandidateDetail(mockCandidates[0]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[aria-label="Candidate Details"]')).toBeTruthy();
  });

  it('should render empty state when no candidates', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/jobs').flush(mockJobs);
    httpMock.expectOne(req => req.url === '/api/candidates/search').flush([]);

    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No candidates match');
  });

  it('should render active filter results summary', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.filters.name = 'Alice';
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Alice');
  });

  it('should render filter clear buttons when filters are set', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();

    component.filters.name = 'test';
    component.filters.skills = 'Java';
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const clearBtns = el.querySelectorAll('.clear-btn');
    expect(clearBtns.length).toBeGreaterThan(0);
  });
});
