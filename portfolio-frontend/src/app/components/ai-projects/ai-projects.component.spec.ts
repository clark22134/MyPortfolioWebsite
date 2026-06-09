import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AiProjectsComponent } from './ai-projects.component';

describe('AiProjectsComponent', () => {
  let component: AiProjectsComponent;
  let fixture: ComponentFixture<AiProjectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiProjectsComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AiProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes a non-empty list of AI projects', () => {
    expect(component.projects.length).toBeGreaterThan(0);
  });

  it('gives every project the fields the template binds to', () => {
    for (const project of component.projects) {
      expect(project.id).toBeTruthy();
      expect(project.title).toBeTruthy();
      expect(project.icon).toBeTruthy();
      expect(project.description).toBeTruthy();
      expect(project.highlights.length).toBeGreaterThan(0);
      expect(project.technologies.length).toBeGreaterThan(0);
      expect(['live', 'in-progress', 'planned']).toContain(project.status);
    }
  });

  it('uses unique project ids', () => {
    const ids = component.projects.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('trackById returns the project id for ngFor identity', () => {
    const project = component.projects[0];
    expect(component.trackById(0, project)).toBe(project.id);
  });
});
