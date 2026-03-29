import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { JobService } from './job.service';
import { Job, JobRequest, TopCandidateMatch } from '../models/ats.models';

describe('JobService', () => {
  let service: JobService;
  let httpMock: HttpTestingController;

  const mockJob: Job = {
    id: 1,
    employer: 'Acme Corp',
    title: 'Senior Engineer',
    department: 'Engineering',
    location: 'Remote',
    description: 'Build things',
    requiredSkills: 'Java, Spring Boot',
    address: '100 Pine St, SF',
    latitude: 37.792,
    longitude: -122.400,
    status: 'OPEN',
    employmentType: 'FULL_TIME',
    candidateCount: 5,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-20T10:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(JobService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all jobs', () => {
    service.getAll().subscribe(jobs => {
      expect(jobs.length).toBe(1);
      expect(jobs[0].title).toBe('Senior Engineer');
    });

    const req = httpMock.expectOne('/api/jobs');
    expect(req.request.method).toBe('GET');
    req.flush([mockJob]);
  });

  it('should get all jobs with status filter', () => {
    service.getAll('OPEN').subscribe(jobs => {
      expect(jobs.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/jobs?status=OPEN');
    expect(req.request.method).toBe('GET');
    req.flush([mockJob]);
  });

  it('should get all jobs with employer filter', () => {
    service.getAll(undefined, 'Acme Corp').subscribe(jobs => {
      expect(jobs.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/jobs?employer=Acme%20Corp');
    expect(req.request.method).toBe('GET');
    req.flush([mockJob]);
  });

  it('should get all jobs with both filters', () => {
    service.getAll('OPEN', 'Acme Corp').subscribe(jobs => {
      expect(jobs.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/jobs?status=OPEN&employer=Acme%20Corp');
    expect(req.request.method).toBe('GET');
    req.flush([mockJob]);
  });

  it('should get a single job by id', () => {
    service.get(1).subscribe(job => {
      expect(job.title).toBe('Senior Engineer');
      expect(job.employer).toBe('Acme Corp');
    });

    const req = httpMock.expectOne('/api/jobs/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockJob);
  });

  it('should create a job', () => {
    const jobRequest: JobRequest = {
      employer: 'Acme Corp',
      title: 'Junior Engineer',
      department: 'Engineering',
      location: 'NYC',
      description: 'Entry level role',
      requiredSkills: 'Java',
      address: '200 Broadway, NYC',
      latitude: null,
      longitude: null,
      status: 'DRAFT',
      employmentType: 'FULL_TIME'
    };

    service.create(jobRequest).subscribe(job => {
      expect(job.title).toBe('Junior Engineer');
    });

    const req = httpMock.expectOne('/api/jobs');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(jobRequest);
    req.flush({ ...mockJob, id: 2, title: 'Junior Engineer' });
  });

  it('should update a job', () => {
    const jobRequest: JobRequest = {
      employer: 'Acme Corp',
      title: 'Staff Engineer',
      department: 'Engineering',
      location: 'Remote',
      description: 'Lead projects',
      requiredSkills: 'Java, AWS',
      address: '100 Pine St, SF',
      latitude: 37.792,
      longitude: -122.400,
      status: 'OPEN',
      employmentType: 'FULL_TIME'
    };

    service.update(1, jobRequest).subscribe(job => {
      expect(job.title).toBe('Staff Engineer');
    });

    const req = httpMock.expectOne('/api/jobs/1');
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockJob, title: 'Staff Engineer' });
  });

  it('should delete a job', () => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne('/api/jobs/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should get top candidates for a job', () => {
    const mockMatches: TopCandidateMatch[] = [
      {
        candidateId: 1,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        skillsMatchPercent: 85,
        daysWorkedScore: 365,
        distanceMiles: 5.2,
        matchedSkills: ['Java', 'Spring Boot'],
        candidateSkills: ['Java', 'Spring Boot', 'Docker']
      }
    ];

    service.getTopCandidates(1).subscribe(matches => {
      expect(matches.length).toBe(1);
      expect(matches[0].skillsMatchPercent).toBe(85);
      expect(matches[0].matchedSkills).toContain('Java');
    });

    const req = httpMock.expectOne('/api/jobs/1/top-candidates');
    expect(req.request.method).toBe('GET');
    req.flush(mockMatches);
  });

  it('should handle 404 for non-existent job', () => {
    service.get(999).subscribe({
      next: () => { throw new Error('should have failed'); },
      error: (error) => {
        expect(error.status).toBe(404);
      }
    });

    const req = httpMock.expectOne('/api/jobs/999');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });
});
