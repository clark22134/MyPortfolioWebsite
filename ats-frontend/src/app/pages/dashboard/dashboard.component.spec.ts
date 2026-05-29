import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { DashboardStats } from '../../models/ats.models';

describe('DashboardComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function flushStats(extra: Partial<DashboardStats> = {}): void {
    const stats: DashboardStats = {
      totalJobs: 6, openJobs: 4, totalCandidates: 13,
      openTasks: 2, overdueTasks: 1, hiredThisMonth: 1,
      candidatesByStage: { APPLIED: 5, SCREENING: 3 } as Record<string, number>,
      jobsByEmployer: { Acme: 3, Pixel: 1 } as Record<string, number>,
      recentActivity: [],
      upcomingTasks: [],
      ...extra
    };
    httpMock.expectOne('/api/dashboard').flush(stats);
  }

  it('shows KPIs once stats arrive', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    flushStats();
    fixture.detectChanges();

    const html = fixture.nativeElement.textContent as string;
    expect(html).toContain('Open positions');
    expect(html).toContain('Total candidates');
    expect(html).toContain('Hired this month');
  });

  it('shows the empty-state messages for activity/tasks when none', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    flushStats();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No activity yet');
    expect(fixture.nativeElement.textContent).toContain('No upcoming tasks');
  });

  it('shows error state on failure', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/dashboard').flush('boom', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Failed to load dashboard');
  });
});
