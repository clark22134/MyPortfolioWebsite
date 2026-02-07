import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ContactRequest, ContactResponse } from '../models/contact.model';

/**
 * Service for handling contact form submissions.
 * Sends contact messages to the backend for email delivery.
 */
@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private static readonly API_URL = '/api/contact';

  constructor(private readonly http: HttpClient) {}

  /**
   * Send a contact form message.
   *
   * @param request The contact form data
   * @returns Observable with the server response
   */
  sendMessage(request: ContactRequest): Observable<ContactResponse> {
    return this.http.post<ContactResponse>(ContactService.API_URL, request);
  }
}
