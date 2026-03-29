import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { DashboardStats } from '../models/ats.models';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  const mockStats: DashboardStats = {
    totalJobs: 10,
    openJobs: 5,
    totalCandidates: 42,
    candidatesByStage: {
      APPLIED: 10,
      SCREENING: 8,
      INTERVIEW: 6,
      ASSESSMENT: 4,
      OFFER: 3,
      HIRED: 7,
      REJECTED: 4
    },
    jobsByEmployer: {
      'Acme Corp': 4,
      'TechStart': 3,
      'BigCo': 3
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get dashboard stats', () => {
    service.getStats().subscribe(stats => {
      expect(stats.totalJobs).toBe(10);
      expect(stats.openJobs).toBe(5);
      expect(stats.totalCandidates).toBe(42);
    });

    const req = httpMock.expectOne('/api/dashboard');
    expect(req.request.method).toBe('GET');
    req.flush(mockStats);
  });

  it('should return candidatesByStage with all stages', () => {
    service.getStats().subscribe(stats => {
      expect(Object.keys(stats.candidatesByStage).length).toBe(7);
      expect(stats.candidatesByStage['APPLIED']).toBe(10);
      expect(stats.candidatesByStage['HIRED']).toBe(7);
    });

    const req = httpMock.expectOne('/api/dashboard');
    req.flush(mockStats);
  });

  it('should return jobsByEmployer grouped correctly', () => {
    service.getStats().subscribe(stats => {
      expect(stats.jobsByEmployer['Acme Corp']).toBe(4);
      expect(stats.jobsByEmployer['TechStart']).toBe(3);
    });

    const req = httpMock.expectOne('/api/dashboard');
    req.flush(mockStats);
  });

  it('should handle empty stats', () => {
    const emptyStats: DashboardStats = {
      totalJobs: 0,
      openJobs: 0,
      totalCandidates: 0,
      candidatesByStage: {},
      jobsByEmployer: {}
    };

    service.getStats().subscribe(stats => {
      expect(stats.totalJobs).toBe(0);
      expect(stats.totalCandidates).toBe(0);
      expect(Object.keys(stats.jobsByEmployer).length).toBe(0);
    });

    const req = httpMock.expectOne('/api/dashboard');
    req.flush(emptyStats);
  });

  it('should propagate HTTP errors', () => {
    service.getStats().subscribe({
      next: () => { throw new Error('should have failed'); },
      error: (error) => {
        expect(error.status).toBe(500);
      }
    });

    const req = httpMock.expectOne('/api/dashboard');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });
});
