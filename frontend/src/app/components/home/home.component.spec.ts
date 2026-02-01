import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    // Set up default return value to prevent undefined.subscribe() errors
    projectService.getFeaturedProjects.and.returnValue(of([]));
    
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with showTerminal as true', () => {
    expect(component.showTerminal).toBe(true);
  });

  it('should have empty terminalLines array initially', () => {
    expect(component.terminalLines).toEqual([]);
  });

  it('should set showCursor to true initially', () => {
    expect(component.showCursor).toBe(true);
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

  it('should render terminal loader when showTerminal is true', () => {
    component.showTerminal = true;
    fixture.detectChanges();

    const terminalElement = fixture.nativeElement.querySelector('.terminal-loader');
    expect(terminalElement).toBeTruthy();
  });

  it('should render home container when showTerminal is false', () => {
    component.showTerminal = false;
    fixture.detectChanges();

    const homeContainer = fixture.nativeElement.querySelector('.home-container');
    expect(homeContainer).toBeTruthy();
  });

  it('should display terminal lines', () => {
    component.terminalLines = ['Line 1', 'Line 2'];
    component.showTerminal = true;
    fixture.detectChanges();

    const lines = fixture.nativeElement.querySelectorAll('.terminal-line');
    expect(lines.length).toBe(2);
  });

  it('should show terminal cursor when showCursor is true', () => {
    component.showTerminal = true;
    component.showCursor = true;
    fixture.detectChanges();

    const cursor = fixture.nativeElement.querySelector('.terminal-cursor');
    expect(cursor).toBeTruthy();
  });

  it('should hide terminal cursor when showCursor is false', () => {
    component.showTerminal = true;
    component.showCursor = false;
    fixture.detectChanges();

    const cursor = fixture.nativeElement.querySelector('.terminal-cursor');
    expect(cursor).toBeFalsy();
  });
});
