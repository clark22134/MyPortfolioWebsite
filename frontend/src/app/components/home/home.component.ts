import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="home-container">
      <section class="hero">
        <div class="hero-content">
          <h1 class="hero-title">Welcome to My Portfolio</h1>
          <p class="hero-subtitle">Full Stack Developer</p>
          <div class="hero-buttons">
            <a routerLink="/projects" class="btn btn-primary">View Projects</a>
            <a routerLink="/login" class="btn btn-secondary">Login</a>
            <a href="https://github.com/clark22134" target="_blank" class="btn btn-outline">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </section>

      <section class="featured-projects">
        <h2>Featured Projects</h2>
        <div class="projects-grid">
          <div *ngFor="let project of featuredProjects" class="project-card">
            <h3>{{ project.title }}</h3>
            <p>{{ project.description }}</p>
            <div class="technologies">
              <span *ngFor="let tech of project.technologies" class="tech-badge">{{ tech }}</span>
            </div>
            <div class="project-links">
              <a *ngIf="project.githubUrl" [href]="project.githubUrl" target="_blank" class="link">
                GitHub
              </a>
              <a *ngIf="project.demoUrl" [href]="project.demoUrl" target="_blank" class="link">
                Live Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      <section class="about">
        <h2>About This Portfolio</h2>
        <p>
          This portfolio website was built using the following technologies:
        </p>
        <ul>
          <li>Angular 19 with TypeScript</li>
          <li>Spring Boot 3.2.1 with Java 21 (LTS)</li>
          <li>RESTful API architecture</li>
          <li>JWT Authentication & Spring Security</li>
          <li>AWS ECS Fargate (Serverless Containers)</li>
          <li>AWS Application Load Balancer (ALB)</li>
          <li>AWS Route 53 (DNS Management)</li>
          <li>AWS Certificate Manager (ACM) with SSL/TLS</li>
          <li>AWS ECR (Container Registry)</li>
          <li>AWS CloudWatch (Logging & Monitoring)</li>
          <li>Terraform Infrastructure as Code</li>
          <li>Docker Multi-Stage Builds</li>
          <li>DevSecOps with GitHub Actions CI/CD</li>
        </ul>
      </section>
    </div>
  `,
  styles: [`
    .home-container {
      min-height: 100vh;
    }

    .hero {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 4rem 2rem;
      text-align: center;
    }

    .hero-content {
      max-width: 800px;
      margin: 0 auto;
    }

    .hero-title {
      font-size: 3rem;
      margin-bottom: 1rem;
      font-weight: 700;
    }

    .hero-subtitle {
      font-size: 1.5rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }

    .hero-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.75rem 2rem;
      border-radius: 25px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: white;
      color: #667eea;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 2px solid white;
    }

    .btn-outline {
      background: transparent;
      color: white;
      border: 2px solid white;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .featured-projects, .about {
      max-width: 1200px;
      margin: 4rem auto;
      padding: 0 2rem;
    }

    h2 {
      font-size: 2.5rem;
      margin-bottom: 2rem;
      text-align: center;
      color: #333;
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2rem;
      margin-top: 2rem;
    }

    .project-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: transform 0.3s, box-shadow 0.3s;
    }

    .project-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 15px rgba(0,0,0,0.2);
    }

    .project-card h3 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #667eea;
    }

    .project-card p {
      color: #666;
      margin-bottom: 1rem;
      line-height: 1.6;
    }

    .technologies {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .tech-badge {
      background: #f0f0f0;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
      color: #666;
    }

    .project-links {
      display: flex;
      gap: 1rem;
    }

    .link {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.3s;
    }

    .link:hover {
      color: #764ba2;
    }

    .about {
      text-align: center;
    }

    .about p {
      font-size: 1.2rem;
      color: #666;
      margin-bottom: 1rem;
    }

    .about ul {
      list-style: none;
      padding: 0;
      display: inline-block;
      text-align: left;
    }

    .about li {
      font-size: 1.1rem;
      color: #333;
      margin: 0.5rem 0;
      padding-left: 1.5rem;
      position: relative;
    }

    .about li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #667eea;
      font-weight: bold;
    }

    @media (max-width: 768px) {
      .hero-title {
        font-size: 2rem;
      }

      .hero-subtitle {
        font-size: 1.2rem;
      }

      .projects-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  featuredProjects: Project[] = [];

  constructor(private projectService: ProjectService) {}

  ngOnInit(): void {
    this.projectService.getFeaturedProjects().subscribe({
      next: (projects: Project[]) => this.featuredProjects = projects,
      error: (err: Error) => console.error('Error loading featured projects', err)
    });
  }
}
