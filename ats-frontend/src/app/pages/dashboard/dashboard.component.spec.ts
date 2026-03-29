import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { DashboardStats } from '../../models/ats.models';

describe('DashboardComponent', () => {
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    fixture.detectChanges();
    httpMock.expectOne('/api/dashboard').flush(mockStats);
  });

  it('should load stats on init', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/dashboard');
    req.flush(mockStats);

    expect(component.stats).toBeTruthy();
    expect(component.stats!.totalJobs).toBe(10);
    expect(component.stats!.openJobs).toBe(5);
    expect(component.stats!.totalCandidates).toBe(42);
  });

  it('should compute stage entries from stats', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/dashboard');
    req.flush(mockStats);

    const component = fixture.componentInstance;
    expect(component.stageEntries.length).toBe(7);
    const applied = component.stageEntries.find(e => e.stage === 'APPLIED');
    expect(applied?.count).toBe(10);
  });

  it('should compute employer chart data', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/dashboard');
    req.flush(mockStats);

    const component = fixture.componentInstance;
    expect(component.employerChartData.length).toBe(3);
    expect(component.employerChartData[0].employer).toBe('Acme Corp');
    expect(component.employerChartData[0].count).toBe(4);
  });

  it('should show error on failure', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/dashboard');
    req.flush('Error', { status: 500, statusText: 'Server Error' });

    const component = fixture.componentInstance;
    expect(component.error).toBe('Failed to load dashboard data. Please try again.');
    expect(component.stats).toBeNull();
  });

  it('should return correct stage labels', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/dashboard').flush(mockStats);

    expect(component.getStageLabel('APPLIED')).toBe('Applied');
    expect(component.getStageLabel('HIRED')).toBe('Hired');
    expect(component.getStageLabel('REJECTED')).toBe('Rejected');
  });

  it('should return correct stage colors', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/dashboard').flush(mockStats);

    expect(component.getStageColor('APPLIED')).toBe('#6366f1');
    expect(component.getStageColor('HIRED')).toBe('#10b981');
    expect(component.getStageColor('REJECTED')).toBe('#ef4444');
  });
});
