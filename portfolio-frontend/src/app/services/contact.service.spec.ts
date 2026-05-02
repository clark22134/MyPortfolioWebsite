import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ContactService } from './contact.service';
import { ContactRequest, ContactResponse } from '../models/contact.model';

describe('ContactService', () => {
  let service: ContactService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ContactService]
    });
    service = TestBed.inject(ContactService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send a contact message', () => {
    const request: ContactRequest = {
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'Hello',
      message: 'I would like to discuss a project.'
    };

    const mockResponse: ContactResponse = {
      message: 'Your message has been sent successfully!'
    };

    service.sendMessage(request).subscribe(response => {
      expect(response.message).toBe('Your message has been sent successfully!');
    });

    const req = httpMock.expectOne('/api/contact');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  it('should handle error response', () => {
    const request: ContactRequest = {
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'Hello',
      message: 'Test message content.'
    };

    service.sendMessage(request).subscribe({
      next: () => expect.fail('should have failed'),
      error: (error) => {
        expect(error.status).toBe(500);
      }
    });

    const req = httpMock.expectOne('/api/contact');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });
});
