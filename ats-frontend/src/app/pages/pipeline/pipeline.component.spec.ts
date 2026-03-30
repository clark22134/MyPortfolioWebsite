import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { PipelineComponent } from './pipeline.component';
import { Job, Candidate } from '../../models/ats.models';

describe('PipelineComponent', () => {
  let httpMock: HttpTestingController;

  const mockJob: Job = {
    id: 1,
    employer: 'Acme Corp',
    title: 'Software Engineer',
    department: 'Engineering',
    location: 'Remote',
    description: 'Build stuff',
    requiredSkills: 'Java',
    address: '',
    latitude: null,
    longitude: null,
    status: 'OPEN',
    employmentType: 'FULL_TIME',
    candidateCount: 2,
    createdAt: '2025-01-15T00:00:00',
    updatedAt: '2025-01-15T00:00:00'
  };

  const mockCandidates: Candidate[] = [
    {
      id: 1,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@test.com',
      phone: '555-1234',
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
      appliedAt: '2025-01-20T00:00:00',
      updatedAt: '2025-01-20T00:00:00'
    },
    {
      id: 2,
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@test.com',
      phone: '555-5678',
      resumeUrl: '',
      notes: 'Strong candidate',
      skills: 'Java, Spring Boot',
      address: '',
      latitude: null,
      longitude: null,
      lastAssignmentDays: 0,
      stage: 'INTERVIEW',
      stageOrder: 0,
      jobId: 1,
      jobTitle: 'Software Engineer',
      talentPool: false,
      appliedAt: '2025-01-22T00:00:00',
      updatedAt: '2025-01-22T00:00:00'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PipelineComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: (key: string) => key === 'id' ? '1' : null } }
          }
        }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PipelineComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    fixture.detectChanges();

    httpMock.expectOne('/api/jobs/1').flush(mockJob);
    httpMock.expectOne('/api/candidates?jobId=1').flush(mockCandidates);
  });

  it('should load job and candidates on init', () => {
    const fixture = TestBed.createComponent(PipelineComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/jobs/1').flush(mockJob);
    httpMock.expectOne('/api/candidates?jobId=1').flush(mockCandidates);

    expect(component.job).toBeTruthy();
    expect(component.job!.title).toBe('Software Engineer');
    expect(component.candidates.length).toBe(2);
  });

  it('should filter candidates by stage', () => {
    const fixture = TestBed.createComponent(PipelineComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/jobs/1').flush(mockJob);
    httpMock.expectOne('/api/candidates?jobId=1').flush(mockCandidates);

    const applied = component.getCandidatesForStage('APPLIED');
    expect(applied.length).toBe(1);
    expect(applied[0].firstName).toBe('Jane');

    const interview = component.getCandidatesForStage('INTERVIEW');
    expect(interview.length).toBe(1);
    expect(interview[0].firstName).toBe('John');
  });

  it('should have active stages excluding REJECTED', () => {
    const fixture = TestBed.createComponent(PipelineComponent);
    const component = fixture.componentInstance;
    expect(component.activeStages).not.toContain('REJECTED');
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs/1').flush(mockJob);
    httpMock.expectOne('/api/candidates?jobId=1').flush(mockCandidates);
  });

  it('should return stage labels', () => {
    const fixture = TestBed.createComponent(PipelineComponent);
    const component = fixture.componentInstance;
    expect(component.getLabel('APPLIED')).toBeTruthy();
    expect(component.getLabel('INTERVIEW')).toBeTruthy();
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs/1').flush(mockJob);
    httpMock.expectOne('/api/candidates?jobId=1').flush(mockCandidates);
  });

  it('should parse skills from comma-separated string', () => {
    const fixture = TestBed.createComponent(PipelineComponent);
    const component = fixture.componentInstance;
    expect(component.parseSkills('Java, Python, Docker')).toEqual(['Java', 'Python', 'Docker']);
    expect(component.parseSkills('')).toEqual([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs/1').flush(mockJob);
    httpMock.expectOne('/api/candidates?jobId=1').flush(mockCandidates);
  });
});
