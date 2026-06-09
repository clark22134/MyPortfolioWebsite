import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ProjectGalleryComponent } from './project-gallery.component';

describe('ProjectGalleryComponent', () => {
  let component: ProjectGalleryComponent;
  let fixture: ComponentFixture<ProjectGalleryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectGalleryComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes a non-empty list of projects', () => {
    expect(component.projects.length).toBeGreaterThan(0);
  });

  it('gives every project the fields the template binds to', () => {
    for (const project of component.projects) {
      expect(project.id).toBeTruthy();
      expect(project.title).toBeTruthy();
      expect(project.description).toBeTruthy();
      expect(project.icon).toBeTruthy();
      expect(project.tags.length).toBeGreaterThan(0);
      expect(['live', 'coming-soon', 'in-progress']).toContain(project.status);
    }
  });

  it('uses unique project ids', () => {
    const ids = component.projects.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points live projects at an external url and coming-soon projects at an internal route', () => {
    for (const project of component.projects) {
      if (project.status === 'live') {
        expect(project.externalUrl).toBeTruthy();
      }
      if (project.status === 'coming-soon') {
        expect(project.route).toBeTruthy();
      }
    }
  });
});
