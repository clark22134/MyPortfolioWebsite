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
});
