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
  template: `
    <app-nav></app-nav>
    
    <div class="contact-container">
      <!-- Cyber Logo -->
      <div class="cyber-logo">
        <div class="logo-icon">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <!-- Terminal window -->
            <rect x="10" y="20" width="80" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
            <line x1="10" y1="30" x2="90" y2="30" stroke="currentColor" stroke-width="2"/>
            <!-- Terminal prompt -->
            <text x="18" y="48" font-family="monospace" font-size="12" fill="currentColor">&gt;_</text>
            <!-- Code lines -->
            <line x1="35" y1="45" x2="70" y2="45" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="35" y1="55" x2="60" y2="55" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="35" y1="65" x2="75" y2="65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="logo-text">
          <span class="logo-prefix">{{ isAuthenticated ? 'root' : 'user' }}&#64;</span><span class="logo-host">portfolio</span>
        </div>
        <div class="scan-line"></div>
      </div>
      
      <div class="contact-content">
        <div class="contact-header">
          <h1>Get In Touch</h1>
          <p class="subtitle">Have a question or want to work together? Drop me a message!</p>
        </div>

        <div class="contact-main">
          <div class="contact-info">
            <div class="info-card">
              <div class="icon">🔗</div>
              <h3>LinkedIn</h3>
              <a href="/linkedin.html" target="_blank">Connect with me</a>
            </div>

            <div class="info-card">
              <div class="icon">💻</div>
              <h3>GitHub</h3>
              <a href="https://github.com/clark22134" target="_blank">Check out my work</a>
            </div>

            <div class="info-card">
              <div class="icon">📧</div>
              <h3>Email</h3>
              <a href="mailto:clark&#64;clarkfoster.com">clark&#64;clarkfoster.com</a>
            </div>
          </div>

          <form class="contact-form" (ngSubmit)="onSubmit()" #contactForm="ngForm">
            <div class="form-group">
              <label for="name">Name *</label>
              <input 
                type="text" 
                id="name" 
                name="name"
                [(ngModel)]="formData.name"
                required
                minlength="2"
                maxlength="100"
                placeholder="Your name"
                class="form-control"
                [class.error]="submitted && contactForm.controls['name']?.invalid"
              >
              <span class="error-text" *ngIf="submitted && contactForm.controls['name']?.invalid">
                Name is required (2-100 characters)
              </span>
            </div>

            <div class="form-group">
              <label for="email">Email *</label>
              <input 
                type="email" 
                id="email" 
                name="email"
                [(ngModel)]="formData.email"
                required
                email
                placeholder="your@email.com"
                class="form-control"
                [class.error]="submitted && contactForm.controls['email']?.invalid"
              >
              <span class="error-text" *ngIf="submitted && contactForm.controls['email']?.invalid">
                Please enter a valid email address
              </span>
            </div>

            <div class="form-group">
              <label for="subject">Subject *</label>
              <input 
                type="text" 
                id="subject" 
                name="subject"
                [(ngModel)]="formData.subject"
                required
                minlength="5"
                maxlength="200"
                placeholder="What's this about?"
                class="form-control"
                [class.error]="submitted && contactForm.controls['subject']?.invalid"
              >
              <span class="error-text" *ngIf="submitted && contactForm.controls['subject']?.invalid">
                Subject is required (5-200 characters)
              </span>
            </div>

            <div class="form-group">
              <label for="message">Message *</label>
              <textarea 
                id="message" 
                name="message"
                [(ngModel)]="formData.message"
                required
                minlength="10"
                maxlength="2000"
                rows="6"
                placeholder="Tell me more..."
                class="form-control"
                [class.error]="submitted && contactForm.controls['message']?.invalid"
              ></textarea>
              <span class="error-text" *ngIf="submitted && contactForm.controls['message']?.invalid">
                Message is required (10-2000 characters)
              </span>
            </div>

            <div *ngIf="successMessage" class="success-message">
              {{ successMessage }}
            </div>

            <div *ngIf="errorMessage" class="error-message">
              {{ errorMessage }}
            </div>

            <button 
              type="submit" 
              class="btn-submit" 
              [disabled]="loading"
            >
              {{ loading ? 'Sending...' : 'Send Message' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .contact-container {
      min-height: calc(100vh - 60px);
      background: #0a0a0a;
      padding: 4rem 2rem;
      position: relative;
    }

    .contact-container::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: 
        repeating-linear-gradient(
          0deg,
          rgba(0, 204, 51, 0.03) 0px,
          transparent 1px,
          transparent 2px,
          rgba(0, 204, 51, 0.03) 3px
        );
      pointer-events: none;
      z-index: 0;
    }

    .contact-content {
      max-width: 1000px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }

    .contact-header {
      text-align: center;
      margin-bottom: 4rem;
      margin-top: 80px;
    }

    h1 {
      color: #00cc33;
      font-size: 2rem;
      margin-bottom: 1rem;
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
      text-shadow: 
        0 0 8px rgba(0, 204, 51, 0.4),
        0 0 15px rgba(0, 204, 51, 0.3);
    }

    .subtitle {
      color: #e0e0e0;
      font-size: 1.2rem;
      opacity: 0.9;
    }

    .contact-main {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 3rem;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .info-card {
      background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
      border-radius: 12px;
      padding: 2rem;
      border: 1px solid rgba(0, 204, 51, 0.3);
      transition: all 0.3s;
      text-align: center;
    }

    .info-card:hover {
      border-color: #00cc33;
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0, 204, 51, 0.3);
    }

    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .info-card h3 {
      color: #00cc33;
      margin-bottom: 0.5rem;
      font-size: 1.2rem;
    }

    .info-card a {
      color: #e0e0e0;
      text-decoration: none;
      transition: color 0.3s;
      display: inline-block;
    }

    .info-card a:hover {
      color: #00cc33;
    }

    .contact-form {
      background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
      border-radius: 12px;
      padding: 3rem;
      border: 1px solid rgba(0, 204, 51, 0.3);
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      color: #00cc33;
      margin-bottom: 0.5rem;
      font-weight: 600;
      font-family: 'Courier New', monospace;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      background: rgba(10, 10, 10, 0.6);
      border: 2px solid rgba(0, 204, 51, 0.3);
      border-radius: 8px;
      color: #e0e0e0;
      font-size: 1rem;
      transition: all 0.3s;
      box-sizing: border-box;
      font-family: inherit;
    }

    .form-control:focus {
      outline: none;
      border-color: #00cc33;
      box-shadow: 0 0 10px rgba(0, 204, 51, 0.3);
    }

    .form-control.error {
      border-color: #ff4444;
    }

    .error-text {
      color: #ff4444;
      font-size: 0.85rem;
      margin-top: 0.25rem;
      display: block;
    }

    textarea.form-control {
      resize: vertical;
      min-height: 120px;
    }

    .success-message {
      background: rgba(0, 204, 51, 0.2);
      border: 1px solid #00cc33;
      color: #00cc33;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .error-message {
      background: rgba(255, 68, 68, 0.2);
      border: 1px solid #ff4444;
      color: #ff4444;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .btn-submit {
      width: 100%;
      padding: 1rem;
      background: rgba(0, 204, 51, 0.2);
      color: #00cc33;
      border: 2px solid #00cc33;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .btn-submit:hover:not(:disabled) {
      background: rgba(0, 204, 51, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 204, 51, 0.4);
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 968px) {
      .contact-main {
        grid-template-columns: 1fr;
      }

      h1 {
        font-size: 2rem;
      }
    }

    @media (max-width: 600px) {
      .contact-container {
        padding: 2rem 1rem;
      }

      .contact-form {
        padding: 2rem 1.5rem;
      }

      h1 {
        font-size: 1.8rem;
      }
    }

    .auth-button {
      position: fixed;
      top: 20px;
      left: 160px;
      z-index: 1001;
      padding: 8px 16px;
      background: rgba(20, 20, 20, 0.85);
      border: 2px solid rgba(0, 204, 51, 0.4);
      border-radius: 6px;
      color: #00cc33;
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      backdrop-filter: blur(10px);
      box-shadow: 0 0 20px rgba(0, 204, 51, 0.2);
      transition: all 0.3s ease;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .auth-button:hover {
      border-color: rgba(0, 204, 51, 0.7);
      box-shadow: 0 0 30px rgba(0, 204, 51, 0.4);
      transform: translateY(-2px);
      background: rgba(0, 204, 51, 0.1);
    }

    .cyber-logo {
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 8px;
      background: rgba(20, 20, 20, 0.85);
      border: 2px solid rgba(0, 204, 51, 0.4);
      border-radius: 8px;
      backdrop-filter: blur(10px);
      box-shadow: 
        0 0 20px rgba(0, 204, 51, 0.2),
        inset 0 0 20px rgba(0, 204, 51, 0.05);
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .cyber-logo:hover {
      border-color: rgba(0, 204, 51, 0.7);
      box-shadow: 
        0 0 30px rgba(0, 204, 51, 0.4),
        inset 0 0 20px rgba(0, 204, 51, 0.1);
      transform: translateY(-2px);
    }

    .logo-icon {
      width: 25px;
      height: 25px;
      color: #00cc33;
      animation: pulse 3s ease-in-out infinite;
      filter: drop-shadow(0 0 8px rgba(0, 204, 51, 0.5));
    }

    .logo-icon svg {
      width: 100%;
      height: 100%;
    }

    .logo-text {
      font-family: 'Courier New', monospace;
      font-size: 0.45rem;
      color: #00cc33;
      text-shadow: 0 0 5px rgba(0, 204, 51, 0.5);
      letter-spacing: 1px;
    }

    .logo-prefix {
      color: #808080;
    }

    .logo-host {
      color: #00cc33;
      font-weight: 600;
    }

    .scan-line {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #00cc33, transparent);
      animation: scanMove 2s linear infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        filter: drop-shadow(0 0 8px rgba(0, 204, 51, 0.5));
      }
      50% {
        opacity: 0.8;
        filter: drop-shadow(0 0 15px rgba(0, 204, 51, 0.7));
      }
    }

    @keyframes scanMove {
      0% {
        transform: translateY(0);
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      100% {
        transform: translateY(-80px);
        opacity: 0;
      }
    }
  `]
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
