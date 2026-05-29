import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { DashboardStats } from '../models/ats.models';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  const mockStats: DashboardStats = {
    totalJobs: 10, openJobs: 5, totalCandidates: 42,
    openTasks: 7, overdueTasks: 1, hiredThisMonth: 3,
    candidatesByStage: {
      APPLIED: 10, SCREENING: 8, INTERVIEW: 6, ASSESSMENT: 4,
      OFFER: 3, HIRED: 7, REJECTED: 4
    },
    jobsByEmployer: { 'Acme Corp': 4, 'TechStart': 3, 'BigCo': 3 },
    recentActivity: [],
    upcomingTasks: []
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  it('fetches dashboard stats', () => {
    service.getStats().subscribe(stats => {
      expect(stats.totalJobs).toBe(10);
      expect(stats.openTasks).toBe(7);
      expect(stats.hiredThisMonth).toBe(3);
    });
    const req = httpMock.expectOne('/api/dashboard');
    expect(req.request.method).toBe('GET');
    req.flush(mockStats);
  });

  it('returns all pipeline stages', () => {
    service.getStats().subscribe(stats => {
      expect(Object.keys(stats.candidatesByStage).length).toBe(7);
      expect(stats.candidatesByStage['APPLIED']).toBe(10);
      expect(stats.candidatesByStage['HIRED']).toBe(7);
    });
    httpMock.expectOne('/api/dashboard').flush(mockStats);
  });

  it('returns jobsByEmployer correctly', () => {
    service.getStats().subscribe(stats => {
      expect(stats.jobsByEmployer['Acme Corp']).toBe(4);
    });
    httpMock.expectOne('/api/dashboard').flush(mockStats);
  });

  it('handles empty stats', () => {
    const empty: DashboardStats = {
      totalJobs: 0, openJobs: 0, totalCandidates: 0,
      openTasks: 0, overdueTasks: 0, hiredThisMonth: 0,
      candidatesByStage: {} as Record<string, number>,
      jobsByEmployer: {} as Record<string, number>,
      recentActivity: [], upcomingTasks: []
    };
    service.getStats().subscribe(stats => expect(stats.totalJobs).toBe(0));
    httpMock.expectOne('/api/dashboard').flush(empty);
  });

  it('propagates HTTP errors', () => {
    service.getStats().subscribe({
      next: () => { throw new Error('should have failed'); },
      error: error => expect(error.status).toBe(500)
    });
    httpMock.expectOne('/api/dashboard')
      .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });
});
