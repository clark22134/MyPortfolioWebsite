import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';
import { NavComponent } from '../nav/nav.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, NavComponent],
  template: `
    <app-nav></app-nav>

    <div class="projects-container">
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

      <h1>Angular/Java Projects</h1>

      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading projects...</p>
      </div>

      <div *ngIf="error" class="error-container">
        <p>{{ error }}</p>
        <button (click)="loadProjects()" class="retry-button">Retry</button>
      </div>

      <div class="projects-grid" *ngIf="!loading && !error">
        <div *ngFor="let project of projects" class="project-card">
          <span *ngIf="project.featured" class="featured-badge">Featured</span>
          <h3>{{ project.title }}</h3>
          <p class="description">{{ project.description }}</p>
          <div class="technologies">
            <span *ngFor="let tech of project.technologies" class="tech-badge">{{ tech }}</span>
          </div>
          <div class="project-meta">
            <div class="dates">
              <span *ngIf="project.startDate">
                <strong>Duration:</strong>
                {{ formatDate(project.startDate) }} -
                {{ project.endDate ? formatDate(project.endDate) : 'Present' }}
              </span>
              <span *ngIf="!project.endDate" class="in-dev-badge">In Development</span>
            </div>
          </div>
          <div class="project-links">
            <a *ngIf="project.githubUrl" [href]="project.githubUrl" target="_blank" class="link">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </a>
            <a *ngIf="project.demoUrl" [href]="project.demoUrl" target="_blank" class="link">
              Live Demo
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .projects-container {
      max-width: 1000px;
      margin: 2rem auto;
      padding: 0 2rem;
      min-height: calc(100vh - 100px);
      position: relative;
      z-index: 1;
    }

    /* Auth Button Styles */
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

    /* Cyber Logo Styles */
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
      width: 38px;
      height: 38px;
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
      font-size: 0.68rem;
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

    h1 {
      font-size: 2rem;
      color: #00cc33;
      text-align: left;
      margin-bottom: 3rem;
      margin-top: 160px;
      font-family: 'Courier New', 'Space Grotesk', monospace;
      letter-spacing: 2px;
      text-shadow:
        0 0 8px rgba(0, 204, 51, 0.4),
        0 0 15px rgba(0, 204, 51, 0.3);
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 2rem;
    }

    .project-card {
      background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      border: 1px solid rgba(0, 204, 51, 0.2);
      overflow: hidden;
    }

    .project-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 204, 51, 0.02) 0px,
        transparent 1px,
        transparent 2px,
        rgba(0, 204, 51, 0.02) 3px
      );
      pointer-events: none;
    }

    .project-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 30px rgba(0, 204, 51, 0.3);
      border-color: rgba(0, 204, 51, 0.5);
    }

    h3 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #00cc33;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      text-shadow: 0 0 5px rgba(0, 204, 51, 0.3);
      position: relative;
      z-index: 1;
    }

    .description {
      color: #b0b0b0;
      line-height: 1.6;
      margin-bottom: 1rem;
      position: relative;
      z-index: 1;
    }

    .technologies {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
      position: relative;
      z-index: 1;
    }

    .tech-badge {
      background: rgba(0, 204, 51, 0.15);
      color: #00cc33;
      padding: 0.4rem 0.9rem;
      border-radius: 12px;
      font-size: 0.875rem;
      border: 1px solid rgba(0, 204, 51, 0.3);
      font-family: 'Courier New', monospace;
      transition: all 0.3s;
    }

    .tech-badge:hover {
      background: rgba(0, 204, 51, 0.3);
      border-color: rgba(0, 204, 51, 0.6);
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 204, 51, 0.3);
    }

    .project-meta {
      margin-bottom: 1rem;
      color: #808080;
      font-size: 0.9rem;
      position: relative;
      z-index: 1;
      font-family: 'Courier New', monospace;
    }

    .dates {
      margin-top: 0.5rem;
    }

    .in-dev-badge {
      display: inline-block;
      margin-left: 0.5rem;
      padding: 0.15rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #00cc33;
      background: rgba(0, 204, 51, 0.1);
      border: 1px solid rgba(0, 204, 51, 0.4);
      border-radius: 4px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .project-links {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
      position: relative;
      z-index: 1;
    }

    .link {
      color: #00cc33;
      text-decoration: none;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      border: 1px solid rgba(0, 204, 51, 0.3);
      font-family: 'Space Grotesk', sans-serif;
    }

    .link:hover {
      background: rgba(0, 204, 51, 0.2);
      border-color: rgba(0, 204, 51, 0.6);
      transform: translateX(3px);
      box-shadow: 0 0 10px rgba(0, 204, 51, 0.3);
    }

    @media (max-width: 768px) {
      .projects-container {
        padding: 0 1rem;
        margin: 1rem auto;
      }

      .projects-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      h1 {
        font-size: 2rem;
        margin-bottom: 2rem;
      }

      .project-card {
        padding: 1.5rem;
      }

      h3 {
        font-size: 1.3rem;
      }

      .description {
        font-size: 0.95rem;
      }

      .tech-badge {
        font-size: 0.8rem;
        padding: 0.3rem 0.7rem;
      }

      .link {
        font-size: 0.9rem;
        padding: 0.4rem 0.8rem;
      }
    }

    .loading-container {
      text-align: center;
      padding: 4rem 2rem;
      color: #00cc33;
    }

    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(0, 204, 51, 0.2);
      border-top-color: #00cc33;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-container {
      text-align: center;
      padding: 4rem 2rem;
      color: #ff4444;
    }

    .error-container p {
      margin-bottom: 1rem;
      font-size: 1.1rem;
    }

    .retry-button {
      background: linear-gradient(135deg, #00cc33 0%, #009926 100%);
      color: #0a0a0a;
      border: none;
      padding: 0.75rem 2rem;
      font-size: 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 204, 51, 0.3);
    }

    .retry-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 204, 51, 0.4);
    }

    @media (max-width: 480px) {
      h1 {
        font-size: 1.5rem;
        letter-spacing: 2px;
      }

      .project-card {
        padding: 1.25rem;
      }

      .project-links {
        flex-direction: column;
        gap: 0.75rem;
      }

      .link {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class ProjectsComponent implements OnInit {
  projects: Project[] = [];
  loading = true;
  error = '';
  isAuthenticated = false;

  constructor(
    private projectService: ProjectService,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.error = '';

    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading projects', err);
        this.error = 'Failed to load projects. Please try again.';
        this.loading = false;
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }
}
