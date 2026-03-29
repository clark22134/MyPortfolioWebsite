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

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should search candidates with name', () => {
    const params: CandidateSearchParams = { name: 'Jane' };

    service.search(params).subscribe(candidates => {
      expect(candidates.length).toBe(1);
      expect(candidates[0].firstName).toBe('Jane');
    });

    const req = httpMock.expectOne('/api/candidates/search?name=Jane');
    expect(req.request.method).toBe('GET');
    req.flush([mockCandidate]);
  });

  it('should search candidates with multiple params', () => {
    const params: CandidateSearchParams = {
      name: 'Jane',
      skills: 'Java',
      stage: 'APPLIED',
      jobId: 1
    };

    service.search(params).subscribe(candidates => {
      expect(candidates.length).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url === '/api/candidates/search'
      && r.params.get('name') === 'Jane'
      && r.params.get('skills') === 'Java'
      && r.params.get('stage') === 'APPLIED'
      && r.params.get('jobId') === '1');
    expect(req.request.method).toBe('GET');
    req.flush([mockCandidate]);
  });

  it('should search candidates with empty params', () => {
    const params: CandidateSearchParams = {};

    service.search(params).subscribe(candidates => {
      expect(candidates.length).toBe(0);
    });

    const req = httpMock.expectOne('/api/candidates/search');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should get candidates by job', () => {
    service.getByJob(1).subscribe(candidates => {
      expect(candidates.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/candidates?jobId=1');
    expect(req.request.method).toBe('GET');
    req.flush([mockCandidate]);
  });

  it('should get candidates by job and stage', () => {
    service.getByJob(1, 'INTERVIEW').subscribe(candidates => {
      expect(candidates.length).toBe(0);
    });

    const req = httpMock.expectOne('/api/candidates?jobId=1&stage=INTERVIEW');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should get a single candidate by id', () => {
    service.get(1).subscribe(candidate => {
      expect(candidate.firstName).toBe('Jane');
      expect(candidate.email).toBe('jane@example.com');
    });

    const req = httpMock.expectOne('/api/candidates/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockCandidate);
  });

  it('should create a candidate', () => {
    const candidateRequest: CandidateRequest = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
      phone: '555-5678',
      resumeUrl: '',
      notes: '',
      skills: 'Python, Django',
      address: '',
      latitude: null,
      longitude: null,
      lastAssignmentDays: 0,
      stage: 'APPLIED',
      jobId: 1
    };

    service.create(candidateRequest).subscribe(candidate => {
      expect(candidate.firstName).toBe('John');
    });

    const req = httpMock.expectOne('/api/candidates');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(candidateRequest);
    req.flush({ ...mockCandidate, id: 2, firstName: 'John', lastName: 'Smith' });
  });

  it('should update a candidate', () => {
    const candidateRequest: CandidateRequest = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.updated@example.com',
      phone: '555-1234',
      resumeUrl: '/resumes/abc.pdf',
      notes: 'Updated notes',
      skills: 'Java, Spring Boot, Docker, AWS',
      address: '384 Grand Ave, Oakland',
      latitude: 37.804,
      longitude: -122.271,
      lastAssignmentDays: 365,
      stage: 'SCREENING',
      jobId: 1
    };

    service.update(1, candidateRequest).subscribe(candidate => {
      expect(candidate.email).toBe('jane.updated@example.com');
    });

    const req = httpMock.expectOne('/api/candidates/1');
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockCandidate, email: 'jane.updated@example.com' });
  });

  it('should move a candidate stage', () => {
    const moveRequest: StageMoveRequest = {
      newStage: 'INTERVIEW',
      newOrder: 0
    };

    service.moveStage(1, moveRequest).subscribe(candidate => {
      expect(candidate.stage).toBe('INTERVIEW');
    });

    const req = httpMock.expectOne('/api/candidates/1/stage');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(moveRequest);
    req.flush({ ...mockCandidate, stage: 'INTERVIEW' });
  });

  it('should delete a candidate', () => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne('/api/candidates/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should upload a resume', () => {
    const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });

    service.uploadResume(file).subscribe(candidate => {
      expect(candidate).toBeTruthy();
    });

    const req = httpMock.expectOne('/api/talent-pool/upload');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush(mockCandidate);
  });

  it('should handle 404 for non-existent candidate', () => {
    service.get(999).subscribe({
      next: () => { throw new Error('should have failed'); },
      error: (error) => {
        expect(error.status).toBe(404);
      }
    });

    const req = httpMock.expectOne('/api/candidates/999');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });
});
