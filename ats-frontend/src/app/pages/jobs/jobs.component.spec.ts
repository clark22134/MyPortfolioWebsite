import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { JobsComponent } from './jobs.component';
import { Job } from '../../models/ats.models';

describe('JobsComponent', () => {
  let httpMock: HttpTestingController;

  const mockJobs: Job[] = [
    {
      id: 1,
      employer: 'Acme Corp',
      title: 'Software Engineer',
      department: 'Engineering',
      location: 'Remote',
      description: 'Build stuff',
      requiredSkills: 'Java, Spring Boot',
      address: '',
      latitude: null,
      longitude: null,
      status: 'OPEN',
      employmentType: 'FULL_TIME',
      candidateCount: 5,
      createdAt: '2025-01-15T00:00:00',
      updatedAt: '2025-01-15T00:00:00'
    },
    {
      id: 2,
      employer: 'Acme Corp',
      title: 'DevOps Engineer',
      department: 'Infrastructure',
      location: 'Seattle, WA',
      description: 'Deploy stuff',
      requiredSkills: 'Docker, Terraform',
      address: '',
      latitude: null,
      longitude: null,
      status: 'CLOSED',
      employmentType: 'FULL_TIME',
      candidateCount: 3,
      createdAt: '2025-02-01T00:00:00',
      updatedAt: '2025-02-01T00:00:00'
    },
    {
      id: 3,
      employer: 'TechStart',
      title: 'Frontend Developer',
      department: 'Product',
      location: 'Austin, TX',
      description: 'UI work',
      requiredSkills: 'Angular, TypeScript',
      address: '',
      latitude: null,
      longitude: null,
      status: 'OPEN',
      employmentType: 'CONTRACT',
      candidateCount: 2,
      createdAt: '2025-03-01T00:00:00',
      updatedAt: '2025-03-01T00:00:00'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);
  });

  it('should load jobs on init', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/jobs');
    req.flush(mockJobs);

    expect(component.jobs.length).toBe(3);
  });

  it('should group jobs by employer', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/jobs').flush(mockJobs);

    expect(component.employerGroups.length).toBe(2);
    const acme = component.employerGroups.find(g => g.employer === 'Acme Corp');
    expect(acme).toBeTruthy();
    expect(acme!.jobs.length).toBe(2);
  });

  it('should count open jobs', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/jobs').flush(mockJobs);

    expect(component.openJobCount).toBe(2);
  });

  it('should format employment type', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    expect(component.formatType('FULL_TIME')).toBe('FULL TIME');
    expect(component.formatType('PART_TIME')).toBe('PART TIME');
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([]);
  });

  it('should toggle showOpenOnly filter', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush(mockJobs);

    expect(component.showOpenOnly).toBe(false);
    component.toggleOpenOnly();
    expect(component.showOpenOnly).toBe(true);
  });

  it('should parse skills from comma-separated string', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    expect(component.parseSkills('Java, Spring Boot, Docker')).toEqual(['Java', 'Spring Boot', 'Docker']);
    expect(component.parseSkills('')).toEqual([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([]);
  });

  it('should handle empty jobs list', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/jobs').flush([]);

    expect(component.jobs.length).toBe(0);
    expect(component.employerGroups.length).toBe(0);
  });

  it('should start with showForm false', () => {
    const fixture = TestBed.createComponent(JobsComponent);
    const component = fixture.componentInstance;
    expect(component.showForm).toBe(false);
    fixture.detectChanges();
    httpMock.expectOne('/api/jobs').flush([]);
  });
});
