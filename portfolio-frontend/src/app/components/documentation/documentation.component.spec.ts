import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DocumentationComponent } from './documentation.component';

const EXPECTED_DOC_SLUGS = [
  'SYSTEM_OVERVIEW',
  'ARCHITECTURE',
  'UNIFIED_ARCHITECTURE',
  'UML_DIAGRAMS',
  'TECHNICAL_DESIGN_DECISIONS',
  'API_DOCUMENTATION',
  'TESTING_STRATEGY',
  'PROJECT_HIGHLIGHTS',
  'DEVOPS_INFRASTRUCTURE',
  'SERVERLESS_MIGRATION',
  'SECURITY_CONSIDERATIONS',
  'PERFORMANCE_SCALABILITY',
  'ACCESSIBILITY',
];

describe('DocumentationComponent', () => {
  let component: DocumentationComponent;
  let fixture: ComponentFixture<DocumentationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentationComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('groups docs into non-empty categories', () => {
    expect(component.categories.length).toBeGreaterThan(0);
    for (const category of component.categories) {
      expect(category.name).toBeTruthy();
      expect(category.docs.length).toBeGreaterThan(0);
    }
  });

  it('gives every doc entry the fields the template binds to', () => {
    const allDocs = component.categories.flatMap(c => c.docs);
    for (const doc of allDocs) {
      expect(doc.slug).toBeTruthy();
      expect(doc.title).toBeTruthy();
      expect(doc.description).toBeTruthy();
      expect(doc.icon).toBeTruthy();
    }
  });

  it('uses unique slugs across all categories', () => {
    const slugs = component.categories.flatMap(c => c.docs.map(d => d.slug));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('lists every public documentation page', () => {
    const slugs = component.categories.flatMap(c => c.docs.map(d => d.slug));
    expect(slugs).toEqual(EXPECTED_DOC_SLUGS);
  });
});
