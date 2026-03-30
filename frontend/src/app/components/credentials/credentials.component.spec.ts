import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CredentialsComponent } from './credentials.component';

describe('CredentialsComponent', () => {
  let component: CredentialsComponent;
  let fixture: ComponentFixture<CredentialsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CredentialsComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CredentialsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default active section as resume', () => {
    expect(component.activeSection).toBe('resume');
  });

  it('should have certifications defined', () => {
    expect(component.certifications).toBeDefined();
    expect(component.certifications.length).toBeGreaterThan(0);
  });

  it('should have FAA licenses defined', () => {
    expect(component.faaLicenses).toBeDefined();
    expect(component.faaLicenses.length).toBe(7);
  });

  it('should have experience entries', () => {
    expect(component.experience).toBeDefined();
    expect(component.experience.length).toBe(3);
  });

  it('should have education entries', () => {
    expect(component.education).toBeDefined();
    expect(component.education.length).toBe(2);
  });

  it('should have technical skills', () => {
    expect(component.technicalSkills).toBeDefined();
    expect(component.technicalSkills.length).toBeGreaterThan(0);
  });

  it('should render page title', () => {
    const titleEl = fixture.nativeElement.querySelector('#credentials-page-title');
    expect(titleEl).toBeTruthy();
    expect(titleEl.textContent).toContain('Credentials');
  });

  it('should render section nav pills', () => {
    const pills = fixture.nativeElement.querySelectorAll('.nav-pill');
    expect(pills.length).toBe(3);
  });

  it('should render resume section', () => {
    const resumeSection = fixture.nativeElement.querySelector('#resume');
    expect(resumeSection).toBeTruthy();
  });

  it('should render certifications section', () => {
    const certsSection = fixture.nativeElement.querySelector('#certifications');
    expect(certsSection).toBeTruthy();
  });

  it('should render FAA section', () => {
    const faaSection = fixture.nativeElement.querySelector('#faa');
    expect(faaSection).toBeTruthy();
  });

  it('should render certification cards', () => {
    const certCards = fixture.nativeElement.querySelectorAll('.cert-card');
    expect(certCards.length).toBe(component.certifications.length);
  });

  it('should render FAA license cards', () => {
    const faaCards = fixture.nativeElement.querySelectorAll('.faa-card');
    expect(faaCards.length).toBe(component.faaLicenses.length);
  });

  it('should render experience entries', () => {
    const entries = fixture.nativeElement.querySelectorAll('.experience-entry');
    expect(entries.length).toBe(component.experience.length);
  });

  it('should render download PDF link', () => {
    const downloadLink = fixture.nativeElement.querySelector('.btn-download');
    expect(downloadLink).toBeTruthy();
    expect(downloadLink.getAttribute('href')).toBe('/resume.pdf');
  });

  it('should update activeSection on scrollToSection', () => {
    component.scrollToSection('certifications');
    expect(component.activeSection).toBe('certifications');

    component.scrollToSection('faa');
    expect(component.activeSection).toBe('faa');
  });

  it('should include recertification notice for CFI licenses', () => {
    const cfiLicenses = component.faaLicenses.filter(
      l => l.details.includes('Recertification required')
    );
    expect(cfiLicenses.length).toBe(3);
  });

  it('should have Commercial Pilot with ASEL and AMEL ratings', () => {
    const commercial = component.faaLicenses.find(l => l.title.includes('Commercial'));
    expect(commercial).toBeTruthy();
    expect(commercial!.details.length).toBe(2);
    expect(commercial!.details[0]).toContain('ASEL');
    expect(commercial!.details[1]).toContain('AMEL');
  });
});
