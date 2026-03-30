import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have current year', () => {
    expect(component.currentYear).toBe(new Date().getFullYear());
  });

  it('should render footer element', () => {
    const footer = fixture.nativeElement.querySelector('footer');
    expect(footer).toBeTruthy();
  });

  it('should display Clark Foster name', () => {
    const heading = fixture.nativeElement.querySelector('.footer-section h2');
    expect(heading.textContent).toContain('Clark Foster');
  });

  it('should render quick links', () => {
    const links = fixture.nativeElement.querySelectorAll('.footer-links a');
    expect(links.length).toBeGreaterThan(0);
  });

  it('should display copyright with current year', () => {
    const copyright = fixture.nativeElement.querySelector('.footer-bottom p');
    expect(copyright.textContent).toContain(String(new Date().getFullYear()));
    expect(copyright.textContent).toContain('Clark Foster');
  });

  it('should have contentinfo role on footer', () => {
    const footer = fixture.nativeElement.querySelector('footer');
    expect(footer.getAttribute('role')).toBe('contentinfo');
  });
});
