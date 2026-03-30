import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { ContactComponent } from './contact.component';
import { ContactService } from '../../services/contact.service';
import { of, throwError } from 'rxjs';

describe('ContactComponent', () => {
  let component: ContactComponent;
  let fixture: ComponentFixture<ContactComponent>;
  let contactService: jasmine.SpyObj<ContactService>;

  beforeEach(async () => {
    const contactServiceSpy = jasmine.createSpyObj('ContactService', ['sendMessage']);

    await TestBed.configureTestingModule({
      imports: [
        ContactComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        FormsModule
      ],
      providers: [
        { provide: ContactService, useValue: contactServiceSpy }
      ]
    }).compileComponents();

    contactService = TestBed.inject(ContactService) as jasmine.SpyObj<ContactService>;
    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have empty form data initially', () => {
    expect(component.formData.name).toBe('');
    expect(component.formData.email).toBe('');
    expect(component.formData.subject).toBe('');
    expect(component.formData.message).toBe('');
  });

  it('should not be loading initially', () => {
    expect(component.loading).toBeFalse();
  });

  it('should not be submitted initially', () => {
    expect(component.submitted).toBeFalse();
  });

  it('should not submit when form fields are empty', () => {
    component.onSubmit();
    expect(component.submitted).toBeTrue();
    expect(contactService.sendMessage).not.toHaveBeenCalled();
  });

  it('should call sendMessage when form is valid', () => {
    contactService.sendMessage.and.returnValue(of({ message: 'Message sent successfully!' }));

    const formData = {
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'Test Subject',
      message: 'This is a test message.'
    };
    component.formData = { ...formData };

    component.onSubmit();

    expect(contactService.sendMessage).toHaveBeenCalledWith(formData);
  });

  it('should set success message on successful submission', () => {
    contactService.sendMessage.and.returnValue(of({ message: 'Sent!' }));

    component.formData = {
      name: 'John',
      email: 'john@test.com',
      subject: 'Hello',
      message: 'Test message here'
    };

    component.onSubmit();

    expect(component.successMessage).toBe('Sent!');
    expect(component.loading).toBeFalse();
  });

  it('should set error message on failed submission', () => {
    contactService.sendMessage.and.returnValue(
      throwError(() => ({ error: { error: 'Server error' } }))
    );

    component.formData = {
      name: 'John',
      email: 'john@test.com',
      subject: 'Hello',
      message: 'Test message here'
    };

    component.onSubmit();

    expect(component.errorMessage).toBe('Server error');
    expect(component.loading).toBeFalse();
  });

  it('should reset form after successful submission', () => {
    contactService.sendMessage.and.returnValue(of({ message: 'Sent!' }));

    component.formData = {
      name: 'John',
      email: 'john@test.com',
      subject: 'Hello',
      message: 'Test message here'
    };

    component.onSubmit();

    expect(component.formData.name).toBe('');
    expect(component.formData.email).toBe('');
    expect(component.submitted).toBeFalse();
  });

  it('should render page title', () => {
    const titleEl = fixture.nativeElement.querySelector('#contact-page-title');
    expect(titleEl).toBeTruthy();
    expect(titleEl.textContent).toContain('Get In Touch');
  });

  it('should render contact form', () => {
    const form = fixture.nativeElement.querySelector('.contact-form');
    expect(form).toBeTruthy();
  });

  it('should render GitHub info card', () => {
    const cards = fixture.nativeElement.querySelectorAll('.info-card');
    expect(cards.length).toBeGreaterThan(0);
    const gitHubCard = Array.from(cards).find(
      (card: any) => card.textContent.includes('GitHub')
    );
    expect(gitHubCard).toBeTruthy();
  });

  it('should render email info card', () => {
    const cards = fixture.nativeElement.querySelectorAll('.info-card');
    const emailCard = Array.from(cards).find(
      (card: any) => card.textContent.includes('Email')
    );
    expect(emailCard).toBeTruthy();
  });

  it('should not render LinkedIn info card', () => {
    const cards = fixture.nativeElement.querySelectorAll('.info-card');
    const linkedInCard = Array.from(cards).find(
      (card: any) => card.textContent.includes('LinkedIn')
    );
    expect(linkedInCard).toBeFalsy();
  });
});
