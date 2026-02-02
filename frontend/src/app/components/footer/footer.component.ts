import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-section">
          <h3>Clark Foster</h3>
          <p class="tagline">Full Stack Developer & Security Engineer</p>
          <p class="description">Building secure, scalable applications with modern cloud technologies.</p>
        </div>

        <div class="footer-section">
          <h4>Quick Links</h4>
          <ul class="footer-links">
            <li><a routerLink="/">Home</a></li>
            <li><a routerLink="/projects">Projects</a></li>
            <li><a routerLink="/contact">Contact</a></li>
            <li><a href="/resume.html" target="_blank">Resume</a></li>
          </ul>
        </div>

        <div class="footer-section">
          <h4>Connect</h4>
          <ul class="footer-links">
            <li>
              <a href="https://github.com/clark22134" target="_blank" rel="noopener noreferrer">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="/linkedin.html" target="_blank" rel="noopener noreferrer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
            </li>
            <li>
              <a href="mailto:clark@clarkfoster.com">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Email
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <p>&copy; {{ currentYear }} Clark Foster. All rights reserved.</p>
        <p class="built-with">Built with Angular & Spring Boot | Deployed on AWS</p>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      border-top: 2px solid rgba(0, 204, 51, 0.3);
      padding: 3rem 2rem 1.5rem;
      margin-top: 4rem;
      position: relative;
    }

    .footer::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: 
        repeating-linear-gradient(
          0deg,
          rgba(0, 204, 51, 0.02) 0px,
          transparent 1px,
          transparent 2px,
          rgba(0, 204, 51, 0.02) 3px
        );
      pointer-events: none;
    }

    .footer-content {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
      position: relative;
      z-index: 1;
    }

    .footer-section h3 {
      color: #00cc33;
      font-size: 1.5rem;
      margin-bottom: 0.75rem;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 5px rgba(0, 204, 51, 0.3);
    }

    .footer-section h4 {
      color: #00cc33;
      font-size: 1.1rem;
      margin-bottom: 1rem;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .tagline {
      color: #e0e0e0;
      font-size: 0.95rem;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .description {
      color: #a0a0a0;
      font-size: 0.9rem;
      line-height: 1.6;
    }

    .footer-links {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .footer-links li {
      margin-bottom: 0.75rem;
    }

    .footer-links a {
      color: #e0e0e0;
      text-decoration: none;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .footer-links a:hover {
      color: #00cc33;
      transform: translateX(5px);
    }

    .footer-links svg {
      transition: transform 0.3s;
    }

    .footer-links a:hover svg {
      transform: scale(1.1);
    }

    .tech-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tech-list li {
      background: rgba(0, 204, 51, 0.1);
      border: 1px solid rgba(0, 204, 51, 0.3);
      color: #00cc33;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-family: 'Courier New', monospace;
      transition: all 0.3s;
    }

    .tech-list li:hover {
      background: rgba(0, 204, 51, 0.2);
      border-color: #00cc33;
      transform: translateY(-2px);
    }

    .footer-bottom {
      max-width: 1200px;
      margin: 2rem auto 0;
      padding-top: 2rem;
      border-top: 1px solid rgba(0, 204, 51, 0.2);
      text-align: center;
      position: relative;
      z-index: 1;
    }

    .footer-bottom p {
      color: #808080;
      font-size: 0.9rem;
      margin: 0.5rem 0;
    }

    .built-with {
      color: #606060;
      font-size: 0.85rem;
    }

    @media (max-width: 768px) {
      .footer-content {
        grid-template-columns: 1fr;
        gap: 2rem;
      }

      .footer {
        padding: 2rem 1rem 1rem;
      }
    }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
