import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HomeComponent } from './home.component';
import { ProjectService } from '../../services/project.service';
import { of } from 'rxjs';
import { Project } from '../../models/project.model';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let projectService: jasmine.SpyObj<ProjectService>;

  const mockProjects: Project[] = [
    {
      id: 1,
      title: 'Portfolio Website',
      description: 'A modern portfolio website',
      technologies: ['Angular', 'Spring Boot'],
      featured: true
    }
  ];

  beforeEach(async () => {
    const projectServiceSpy = jasmine.createSpyObj('ProjectService', ['getFeaturedProjects']);

    await TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ProjectService, useValue: projectServiceSpy }
      ]
    }).compileComponents();

    projectService = TestBed.inject(ProjectService) as jasmine.SpyObj<ProjectService>;
    projectService.getFeaturedProjects.and.returnValue(of([]));

    // Simulate terminal already complete so component initializes properly
    (window as any).__terminalComplete = true;

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    delete (window as any).__terminalComplete;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load featured projects on init', () => {
    projectService.getFeaturedProjects.and.returnValue(of(mockProjects));

    component.ngOnInit();

    expect(projectService.getFeaturedProjects).toHaveBeenCalled();
    expect(component.featuredProjects).toEqual(mockProjects);
  });

  it('should handle empty featured projects', () => {
    projectService.getFeaturedProjects.and.returnValue(of([]));

    component.ngOnInit();

    expect(component.featuredProjects).toEqual([]);
  });

  it('should have featuredProjects array', () => {
    expect(component.featuredProjects).toBeDefined();
    expect(Array.isArray(component.featuredProjects)).toBe(true);
  });

  it('should render home container', () => {
    fixture.detectChanges();

    const homeContainer = fixture.nativeElement.querySelector('.home-container');
    expect(homeContainer).toBeTruthy();
  });

  it('should render hero section', () => {
    fixture.detectChanges();

    const hero = fixture.nativeElement.querySelector('.hero');
    expect(hero).toBeTruthy();
  });

  it('should render skills section', () => {
    fixture.detectChanges();

    const skills = fixture.nativeElement.querySelector('.skills');
    expect(skills).toBeTruthy();
  });

  it('should render about section', () => {
    fixture.detectChanges();

    const about = fixture.nativeElement.querySelector('.about');
    expect(about).toBeTruthy();
  });

  it('should have skill categories defined', () => {
    expect(component.skillCategories).toBeDefined();
    expect(component.skillCategories.length).toBeGreaterThan(0);
  });

  it('should start typing animation after terminal complete', fakeAsync(() => {
    component.ngOnInit();
    tick(600); // 500ms delay + 100ms from waitForTerminalComplete

    expect(component.typedText.length).toBeGreaterThan(0);
  }));

  it('should set sections visible after terminal complete', () => {
    component.ngOnInit();

    expect(component.projectsVisible).toBe(true);
    expect(component.skillsVisible).toBe(true);
    expect(component.aboutVisible).toBe(true);
  });

  it('should set scrolled on window scroll', () => {
    expect(component.scrolled).toBe(false);

    Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
    component.onWindowScroll();

    expect(component.scrolled).toBe(true);
  });

  it('should render nav component', () => {
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('app-nav');
    expect(nav).toBeTruthy();
  });
});
