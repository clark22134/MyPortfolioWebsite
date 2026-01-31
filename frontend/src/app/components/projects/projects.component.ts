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
    }

    h1 {
      font-size: 2.5rem;
      color: #333;
      text-align: center;
      margin-bottom: 3rem;
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 2rem;
    }

    .project-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: transform 0.3s, box-shadow 0.3s;
      position: relative;
    }

    .project-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 15px rgba(0,0,0,0.2);
    }

    h3 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #667eea;
    }

    .description {
      color: #666;
      line-height: 1.6;
      margin-bottom: 1rem;
    }

    .technologies {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .tech-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
    }

    .project-meta {
      margin-bottom: 1rem;
      color: #666;
      font-size: 0.9rem;
    }

    .dates {
      margin-top: 0.5rem;
    }

    .project-links {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }

    .link {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: color 0.3s;
    }

    .link:hover {
      color: #764ba2;
    }

    .featured-badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .projects-grid {
        grid-template-columns: 1fr;
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
