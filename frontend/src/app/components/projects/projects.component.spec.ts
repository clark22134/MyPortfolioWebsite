import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ProjectsComponent } from './projects.component';
import { ProjectService } from '../../services/project.service';
import { of, throwError } from 'rxjs';
import { Project } from '../../models/project.model';

describe('ProjectsComponent', () => {
  let component: ProjectsComponent;
  let fixture: ComponentFixture<ProjectsComponent>;
  let projectService: jasmine.SpyObj<ProjectService>;

  const mockProjects: Project[] = [
    {
      id: 1,
      title: 'Portfolio Website',
      description: 'A modern portfolio website',
      technologies: ['Angular', 'Spring Boot', 'AWS'],
      imageUrl: '/images/portfolio.jpg',
      githubUrl: 'https://github.com/user/portfolio',
      demoUrl: 'https://demo.com',
      featured: true,
      startDate: '2024-01-01',
      endDate: '2024-06-01'
    },
    {
      id: 2,
      title: 'E-commerce Platform',
      description: 'An online shopping platform',
      technologies: ['React', 'Node.js'],
      featured: false
    }
  ];

  beforeEach(async () => {
    const projectServiceSpy = jasmine.createSpyObj('ProjectService', ['getAllProjects']);

    await TestBed.configureTestingModule({
      imports: [ProjectsComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: ProjectService, useValue: projectServiceSpy }
      ]
    }).compileComponents();

    projectService = TestBed.inject(ProjectService) as jasmine.SpyObj<ProjectService>;
    // Set up default return value to prevent undefined.subscribe() errors
    projectService.getAllProjects.and.returnValue(of([]));
    
    fixture = TestBed.createComponent(ProjectsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load projects on init', () => {
    projectService.getAllProjects.and.returnValue(of(mockProjects));

    component.ngOnInit();

    expect(projectService.getAllProjects).toHaveBeenCalled();
    expect(component.projects).toEqual(mockProjects);
  });

  it('should handle empty projects list', () => {
    projectService.getAllProjects.and.returnValue(of([]));

    component.ngOnInit();

    expect(component.projects).toEqual([]);
  });

  it('should handle error when loading projects', () => {
    projectService.getAllProjects.and.returnValue(
      throwError(() => new Error('Failed to load projects'))
    );

    component.ngOnInit();

    expect(component.projects).toEqual([]);
  });

  it('should format date correctly', () => {
    const date = '2024-01-15';
    const formatted = component.formatDate(date);
    
    expect(formatted).toContain('2024');
    expect(formatted).toContain('Jan');
  });

  it('should render project cards', () => {
    projectService.getAllProjects.and.returnValue(of(mockProjects));
    fixture.detectChanges();

    const projectCards = fixture.nativeElement.querySelectorAll('.project-card');
    expect(projectCards.length).toBe(2);
  });

  it('should display project title', () => {
    projectService.getAllProjects.and.returnValue(of([mockProjects[0]]));
    fixture.detectChanges();

    const titleElement = fixture.nativeElement.querySelector('.project-card h3');
    expect(titleElement.textContent).toContain('Portfolio Website');
  });

  it('should display project description', () => {
    projectService.getAllProjects.and.returnValue(of([mockProjects[0]]));
    fixture.detectChanges();

    const descElement = fixture.nativeElement.querySelector('.project-card .description');
    expect(descElement.textContent).toContain('A modern portfolio website');
  });

  it('should display technologies', () => {
    projectService.getAllProjects.and.returnValue(of([mockProjects[0]]));
    fixture.detectChanges();

    const techBadges = fixture.nativeElement.querySelectorAll('.tech-badge');
    expect(techBadges.length).toBe(3);
    expect(techBadges[0].textContent).toContain('Angular');
  });

  it('should show GitHub link when githubUrl exists', () => {
    projectService.getAllProjects.and.returnValue(of([mockProjects[0]]));
    fixture.detectChanges();

    const githubLink = fixture.nativeElement.querySelector('a[href="https://github.com/user/portfolio"]');
    expect(githubLink).toBeTruthy();
    expect(githubLink.textContent).toContain('GitHub');
  });

  it('should show demo link when demoUrl exists', () => {
    projectService.getAllProjects.and.returnValue(of([mockProjects[0]]));
    fixture.detectChanges();

    const demoLink = fixture.nativeElement.querySelector('a[href="https://demo.com"]');
    expect(demoLink).toBeTruthy();
    expect(demoLink.textContent).toContain('Live Demo');
  });

  it('should display featured badge for featured projects', () => {
    projectService.getAllProjects.and.returnValue(of([mockProjects[0]]));
    fixture.detectChanges();

    const featuredBadge = fixture.nativeElement.querySelector('.featured-badge');
    expect(featuredBadge).toBeTruthy();
    expect(featuredBadge.textContent).toContain('Featured');
  });

  it('should not display featured badge for non-featured projects', () => {
    projectService.getAllProjects.and.returnValue(of([mockProjects[1]]));
    fixture.detectChanges();

    const featuredBadge = fixture.nativeElement.querySelector('.featured-badge');
    expect(featuredBadge).toBeFalsy();
  });

  it('should display project dates when available', () => {
    projectService.getAllProjects.and.returnValue(of([mockProjects[0]]));
    fixture.detectChanges();

    const datesElement = fixture.nativeElement.querySelector('.dates');
    expect(datesElement).toBeTruthy();
    expect(datesElement.textContent).toContain('Duration:');
  });

  it('should display "Present" when endDate is not provided', () => {
    const projectWithoutEndDate: Project = {
      ...mockProjects[0],
      endDate: undefined
    };
    projectService.getAllProjects.and.returnValue(of([projectWithoutEndDate]));
    fixture.detectChanges();

    const datesElement = fixture.nativeElement.querySelector('.dates');
    expect(datesElement.textContent).toContain('Present');
  });
});
