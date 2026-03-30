import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../services/contact.service';
import { ContactRequest } from '../../models/contact.model';
import { NavComponent } from '../nav/nav.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, NavComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  formData: ContactRequest = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  loading = false;
  submitted = false;
  successMessage = '';
  errorMessage = '';
  isAuthenticated = false;

  constructor(
    private contactService: ContactService,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    // Basic validation check
    if (!this.formData.name || !this.formData.email || !this.formData.subject || !this.formData.message) {
      return;
    }

    this.loading = true;

    this.contactService.sendMessage(this.formData).subscribe({
      next: (response) => {
        this.loading = false;
        this.successMessage = response.message || 'Message sent successfully!';
        this.resetForm();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.error || 'Failed to send message. Please try emailing directly at clark@clarkfoster.com';
      }
    });
  }

  resetForm(): void {
    this.formData = {
      name: '',
      email: '',
      subject: '',
      message: ''
    };
    this.submitted = false;
  }
}
