declare const vi: typeof import('vitest').vi;
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TalentComponent } from './talent.component';
import { AuthService } from '../../services/auth.service';
import { Candidate } from '../../models/ats.models';

describe('TalentComponent', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;

  const mkCandidate = (overrides: Partial<Candidate> = {}): Candidate => ({
    id: 10, firstName: 'Alice', lastName: 'Smith', email: 'a@b.com', phone: '555',
    resumeUrl: '', notes: '', skills: 'Java',
    address: '', latitude: null, longitude: null, lastAssignmentDays: 0,
    stage: 'APPLIED', stageOrder: 0, jobId: 1, jobTitle: 'Eng', talentPool: false,
    tags: [], appliedAt: '2026-01-01', updatedAt: '2026-01-01',
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TalentComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth['_currentUser'].set({
      id: 1, username: 'rec', email: 'a@b.com', fullName: 'Rec',
      role: 'RECRUITER', enabled: true, createdAt: '2026-01-01', lastLoginAt: null
    });
  });

  afterEach(() => httpMock.verify());

  function initialLoad(candidates: Candidate[] = []) {
    httpMock.expectOne('/api/jobs').flush([]);
    httpMock.expectOne(r => r.url === '/api/candidates/search').flush(candidates);
  }

  it('renders empty state when no candidates', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No candidates');
  });

  it('renders candidate cards', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad([mkCandidate()]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Alice Smith');
  });

  it('hasActiveFilter detects each filter', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    const c = fixture.componentInstance;
    expect(c.hasActiveFilter()).toBe(false);
    c.filters.name = 'Jane';
    expect(c.hasActiveFilter()).toBe(true);
    c.filters.name = '';
    c.filters.skills = 'java';
    expect(c.hasActiveFilter()).toBe(true);
  });

  it('clearField clears name and reruns search', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    const c = fixture.componentInstance;
    c.filters.name = 'Jane';
    c.clearField('name');
    expect(c.filters.name).toBe('');
    httpMock.expectOne(r => r.url === '/api/candidates/search').flush([]);
  });

  it('filterBySkill toggles a skill', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    const c = fixture.componentInstance;
    c.filterBySkill('Java');
    expect(c.filters.skills).toContain('Java');
    httpMock.expectOne(r => r.url === '/api/candidates/search').flush([]);
    c.filterBySkill('Java');
    expect(c.filters.skills).not.toContain('Java');
    httpMock.expectOne(r => r.url === '/api/candidates/search').flush([]);
  });

  it('parseSkills handles empty + valid input', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    expect(fixture.componentInstance.parseSkills('')).toEqual([]);
    expect(fixture.componentInstance.parseSkills('Java, Docker')).toEqual(['Java', 'Docker']);
  });

  it('isSkillMatch matches case-insensitively', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    fixture.componentInstance.filters.skills = 'Java';
    expect(fixture.componentInstance.isSkillMatch('java')).toBe(true);
    expect(fixture.componentInstance.isSkillMatch('Python')).toBe(false);
  });

  it('formatFileSize handles bytes/KB/MB', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    expect(fixture.componentInstance.formatFileSize(500)).toContain('B');
    expect(fixture.componentInstance.formatFileSize(2048)).toContain('KB');
    expect(fixture.componentInstance.formatFileSize(2_000_000)).toContain('MB');
  });

  it('stage helpers return values', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    const c = fixture.componentInstance;
    expect(c.stageLabel('APPLIED')).toBeTruthy();
    expect(c.stageColor('APPLIED')).toMatch(/^#/);
    expect(c.stageBg('APPLIED')).toMatch(/^#/);
  });

  it('openAdd / closeAdd toggle the form', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    const c = fixture.componentInstance;
    c.openAdd();
    expect(c.showAddModal).toBe(true);
    c.closeAdd();
    expect(c.showAddModal).toBe(false);
  });

  it('openUpload / closeUpload toggle the upload modal', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    const c = fixture.componentInstance;
    c.openUpload();
    expect(c.showUploadModal).toBe(true);
    c.closeUpload();
    expect(c.showUploadModal).toBe(false);
  });

  it('openCandidateDetail navigates to detail route', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    const navSpy = vi.spyOn(fixture.componentInstance.router, 'navigate');
    fixture.componentInstance.openCandidateDetail(mkCandidate({ id: 7 }));
    expect(navSpy).toHaveBeenCalledWith(['/candidates', 7]);
  });

  it('saveAdd posts to API and reruns search', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    const c = fixture.componentInstance;
    c.addForm = { firstName: 'Z', lastName: 'Y', email: 'z@y.com', stage: 'APPLIED', jobId: 1 };
    c.saveAdd();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/candidates').flush(mkCandidate({ id: 99 }));
    httpMock.expectOne(r => r.url === '/api/candidates/search').flush([mkCandidate({ id: 99 })]);
    expect(c.showAddModal).toBe(false);
  });

  it('openEdit + saveEdit submit a PUT', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad([mkCandidate()]);
    const c = fixture.componentInstance;
    c.openEdit(mkCandidate());
    expect(c.editingCandidate).not.toBeNull();
    c.saveEdit();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/candidates/10').flush(mkCandidate());
    httpMock.expectOne(r => r.url === '/api/candidates/search').flush([]);
    expect(c.editingCandidate).toBeNull();
  });

  it('deleteCandidate confirms and DELETEs', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    fixture.componentInstance.deleteCandidate(10);
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/candidates/10').flush(null);
    httpMock.expectOne(r => r.url === '/api/candidates/search').flush([]);
  });

  it('onDragOver prevents default; onDrop captures file', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    const c = fixture.componentInstance;
    const file = new File(['x'], 'r.pdf', { type: 'application/pdf' });
    const evt = { preventDefault: vi.fn(), dataTransfer: { files: [file] } } as unknown as DragEvent;
    c.onDragOver(evt);
    expect((evt.preventDefault as any).mock.calls.length).toBe(1);
    c.onDrop(evt);
    expect(c.uploadFile).toBe(file);
  });

  it('renders candidate rows in the list', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    const candidate = mkCandidate({ notes: 'Note text', tags: [{ id: 1, name: 'Top', color: '#0f0' }] });
    initialLoad([candidate]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Alice Smith');
    expect(fixture.nativeElement.textContent).toContain('Java');
  });

  it('upload modal handles file change', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    const c = fixture.componentInstance;
    c.openUpload();
    const file = new File(['x'], 'r.pdf', { type: 'application/pdf' });
    c.onFileChange({ target: { files: [file] } } as unknown as Event);
    expect(c.uploadFile).toBe(file);
  });

  it('upload submit triggers POST', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    const c = fixture.componentInstance;
    c.uploadFile = new File(['x'], 'r.pdf', { type: 'application/pdf' });
    c.submitUpload();
    httpMock.expectOne('/api/talent-pool/upload').flush(mkCandidate());
    httpMock.expectOne(r => r.url === '/api/candidates/search').flush([mkCandidate()]);
    expect(c.uploading).toBe(false);
  });

  it('pagination navigates pages', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    const many = Array.from({ length: 30 }, (_, i) => mkCandidate({ id: i + 1 }));
    initialLoad(many);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.totalPages).toBeGreaterThan(1);
    c.nextPage();
    expect(c.page).toBe(2);
    c.prevPage();
    expect(c.page).toBe(1);
    c.goToPage(c.totalPages);
    expect(c.page).toBe(c.totalPages);
  });

  it('resetFilters clears every field', () => {
    const fixture = TestBed.createComponent(TalentComponent);
    fixture.detectChanges();
    initialLoad();
    const c = fixture.componentInstance;
    c.filters.name = 'X'; c.filters.skills = 'Y'; c.filters.stage = 'APPLIED'; c.filters.jobId = 1;
    c.resetFilters();
    expect(c.filters.name).toBe('');
    expect(c.filters.skills).toBe('');
    expect(c.filters.stage).toBe('');
    expect(c.filters.jobId).toBeNull();
    httpMock.expectOne(r => r.url === '/api/candidates/search').flush([]);
  });
});
