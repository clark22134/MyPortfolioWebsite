import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="projects-container">
      <h1>My Projects</h1>
      <div class="projects-grid">
        <div *ngFor="let project of projects" class="project-card">
          <h3>{{ project.title }}</h3>
          <p class="description">{{ project.description }}</p>
          <div class="technologies">
            <span *ngFor="let tech of project.technologies" class="tech-badge">{{ tech }}</span>
          </div>
          <div class="project-meta">
            <div *ngIf="project.startDate" class="dates">
              <strong>Duration:</strong> 
              {{ formatDate(project.startDate) }} - 
              {{ project.endDate ? formatDate(project.endDate) : 'Present' }}
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
          <div *ngIf="project.featured" class="featured-badge">Featured</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .projects-container {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 2rem;
      min-height: calc(100vh - 100px);
      position: relative;
      z-index: 1;
    }

    h1 {
      font-size: 3rem;
      color: #00cc33;
      text-align: center;
      margin-bottom: 3rem;
      font-family: 'Courier New', 'Space Grotesk', monospace;
      text-transform: uppercase;
      letter-spacing: 3px;
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

    .featured-badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: rgba(0, 204, 51, 0.2);
      color: #00cc33;
      padding: 0.4rem 0.9rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid rgba(0, 204, 51, 0.4);
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      z-index: 2;
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

  constructor(private projectService: ProjectService) {}

  ngOnInit(): void {
    this.projectService.getAllProjects().subscribe({
      next: (projects) => this.projects = projects,
      error: (err) => console.error('Error loading projects', err)
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }
}
