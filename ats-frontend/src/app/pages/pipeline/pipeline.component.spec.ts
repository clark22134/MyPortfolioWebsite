import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PipelineComponent } from './pipeline.component';
import { AuthService } from '../../services/auth.service';
import { Candidate } from '../../models/ats.models';

describe('PipelineComponent', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;

  const mkCandidate = (overrides: Partial<Candidate> = {}): Candidate => ({
    id: 1, firstName: 'A', lastName: 'B', email: 'a@b.com', phone: '',
    resumeUrl: '', notes: '', skills: '',
    address: '', latitude: null, longitude: null, lastAssignmentDays: 0,
    stage: 'APPLIED', stageOrder: 0, jobId: 1, jobTitle: 'Eng', talentPool: false,
    tags: [], appliedAt: '2026-01-01', updatedAt: '2026-01-01',
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PipelineComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } }
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

  function fulfillLoad(candidates: Candidate[] = []) {
    httpMock.expectOne('/api/jobs/1').flush({
      id: 1, employer: 'Acme', title: 'Eng', department: 'Eng', location: 'R',
      description: '', requiredSkills: '', address: '', latitude: null, longitude: null,
      status: 'OPEN', employmentType: 'FULL_TIME', candidateCount: candidates.length,
      createdAt: '2026-01-01', updatedAt: '2026-01-01'
    });
    httpMock.expectOne('/api/candidates?jobId=1').flush(candidates);
  }

  it('groups candidates by stage', () => {
    const fixture = TestBed.createComponent(PipelineComponent);
    fixture.detectChanges();
    fulfillLoad([mkCandidate({ id: 1, stage: 'APPLIED' }), mkCandidate({ id: 2, stage: 'SCREENING' })]);
    fixture.detectChanges();
    expect(fixture.componentInstance.getCandidatesForStage('APPLIED').length).toBe(1);
    expect(fixture.componentInstance.getCandidatesForStage('SCREENING').length).toBe(1);
  });

  it('opens edit modal with seeded form', () => {
    const fixture = TestBed.createComponent(PipelineComponent);
    fixture.detectChanges();
    const candidate = mkCandidate();
    fulfillLoad([candidate]);
    fixture.componentInstance.openEdit(candidate);
    expect(fixture.componentInstance.editingCandidate).toBe(candidate);
    expect(fixture.componentInstance.editForm.firstName).toBe('A');
    fixture.componentInstance.closeEdit();
    expect(fixture.componentInstance.editingCandidate).toBeNull();
  });

  it('parseSkills handles cases', () => {
    const fixture = TestBed.createComponent(PipelineComponent);
    fixture.detectChanges();
    fulfillLoad();
    expect(fixture.componentInstance.parseSkills('Java,Docker')).toEqual(['Java', 'Docker']);
    expect(fixture.componentInstance.parseSkills('')).toEqual([]);
  });

  it('stage helpers return values', () => {
    const fixture = TestBed.createComponent(PipelineComponent);
    fixture.detectChanges();
    fulfillLoad();
    expect(fixture.componentInstance.getLabel('APPLIED')).toBe('Applied');
    expect(fixture.componentInstance.getColor('APPLIED')).toMatch(/^#/);
  });
});
