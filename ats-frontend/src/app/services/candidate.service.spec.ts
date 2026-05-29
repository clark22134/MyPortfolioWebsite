import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CandidateService, CandidateSearchParams } from './candidate.service';
import { Candidate, CandidateRequest, StageMoveRequest } from '../models/ats.models';

describe('CandidateService', () => {
  let service: CandidateService;
  let httpMock: HttpTestingController;

  const mockCandidate: Candidate = {
    id: 1,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '555-1234',
    resumeUrl: '/resumes/abc.pdf',
    notes: 'Strong candidate',
    skills: 'Java, Spring Boot, Docker',
    address: '384 Grand Ave, Oakland',
    latitude: 37.804,
    longitude: -122.271,
    lastAssignmentDays: 365,
    stage: 'APPLIED',
    stageOrder: 0,
    jobId: 1,
    jobTitle: 'Senior Engineer',
    talentPool: false,
    tags: [],
    appliedAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-20T10:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CandidateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  it('searches with name', () => {
    service.search({ name: 'Jane' }).subscribe(list => expect(list.length).toBe(1));
    const req = httpMock.expectOne('/api/candidates/search?name=Jane');
    expect(req.request.method).toBe('GET');
    req.flush([mockCandidate]);
  });

  it('searches with sort + multi-filter', () => {
    const params: CandidateSearchParams = { name: 'Jane', skills: 'Java', stage: 'APPLIED', jobId: 1, sort: 'applied' };
    service.search(params).subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/candidates/search'
      && r.params.get('sort') === 'applied'
      && r.params.get('skills') === 'Java');
    req.flush([mockCandidate]);
  });

  it('gets candidates by job', () => {
    service.getByJob(1).subscribe();
    httpMock.expectOne('/api/candidates?jobId=1').flush([mockCandidate]);
  });

  it('gets candidates by job + stage', () => {
    service.getByJob(1, 'INTERVIEW').subscribe();
    httpMock.expectOne('/api/candidates?jobId=1&stage=INTERVIEW').flush([]);
  });

  it('gets a single candidate', () => {
    service.get(1).subscribe(c => expect(c.firstName).toBe('Jane'));
    httpMock.expectOne('/api/candidates/1').flush(mockCandidate);
  });

  it('creates a candidate', () => {
    const req: CandidateRequest = {
      firstName: 'John', lastName: 'Smith', email: 'j@x.com', phone: '', resumeUrl: '',
      notes: '', skills: '', address: '', latitude: null, longitude: null,
      lastAssignmentDays: 0, stage: 'APPLIED', jobId: 1
    };
    service.create(req).subscribe();
    const r = httpMock.expectOne('/api/candidates');
    expect(r.request.method).toBe('POST');
    r.flush({ ...mockCandidate, firstName: 'John' });
  });

  it('updates a candidate', () => {
    const req: CandidateRequest = {
      firstName: 'Jane', lastName: 'Doe', email: 'new@x.com', phone: '', resumeUrl: '',
      notes: '', skills: '', address: '', latitude: null, longitude: null,
      lastAssignmentDays: 0, stage: 'SCREENING', jobId: 1
    };
    service.update(1, req).subscribe();
    const r = httpMock.expectOne('/api/candidates/1');
    expect(r.request.method).toBe('PUT');
    r.flush({ ...mockCandidate, email: 'new@x.com' });
  });

  it('moves stage', () => {
    const req: StageMoveRequest = { newStage: 'INTERVIEW', newOrder: 0 };
    service.moveStage(1, req).subscribe();
    const r = httpMock.expectOne('/api/candidates/1/stage');
    expect(r.request.method).toBe('PATCH');
    r.flush({ ...mockCandidate, stage: 'INTERVIEW' });
  });

  it('deletes a candidate', () => {
    service.delete(1).subscribe();
    const r = httpMock.expectOne('/api/candidates/1');
    expect(r.request.method).toBe('DELETE');
    r.flush(null);
  });

  it('uploads a resume', () => {
    const file = new File(['x'], 'resume.pdf', { type: 'application/pdf' });
    service.uploadResume(file).subscribe();
    const r = httpMock.expectOne('/api/talent-pool/upload');
    expect(r.request.method).toBe('POST');
    expect(r.request.body instanceof FormData).toBe(true);
    r.flush(mockCandidate);
  });
});
