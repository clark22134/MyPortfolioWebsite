import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface ProjectCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  tags: string[];
  status: 'live' | 'coming-soon' | 'in-progress';
  externalUrl?: string;
  githubUrl?: string;
}

@Component({
  selector: 'app-project-gallery',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="project-gallery">
      <header class="gallery-header">
        <h1>Interactive Projects</h1>
        <p>Explore my full-stack applications built with Angular and Spring Boot</p>
      </header>

      <div class="projects-grid">
        @for (project of projects; track project.id) {
          <div class="project-card" [class.coming-soon]="project.status !== 'live'">
            <div class="project-icon">{{ project.icon }}</div>
            <h3>{{ project.title }}</h3>
            <p>{{ project.description }}</p>
            <div class="tags">
              @for (tag of project.tags; track tag) {
                <span class="tag">{{ tag }}</span>
              }
            </div>
            <div class="card-actions">
              @if (project.status === 'live' && project.externalUrl) {
                <a [href]="project.externalUrl" class="launch-btn" target="_blank" rel="noopener">
                  <span class="btn-icon">🚀</span> Live Demo
                </a>
              } @else if (project.status === 'live') {
                <a [routerLink]="project.route" class="launch-btn">
                  <span class="btn-icon">🚀</span> Live Demo
                </a>
              } @else {
                <span class="status-badge">{{ project.status === 'in-progress' ? 'In Progress' : 'Coming Soon' }}</span>
              }
              @if (project.githubUrl) {
                <a [href]="project.githubUrl" class="github-btn" target="_blank" rel="noopener">
                  <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .project-gallery {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .gallery-header {
      text-align: center;
      margin-bottom: 3rem;

      h1 {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
      }

      p {
        color: #666;
        font-size: 1.1rem;
      }
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2rem;
    }

    .project-card {
      background: #fff;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;

      &:hover:not(.coming-soon) {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }

      &.coming-soon {
        opacity: 0.7;
      }
    }

    .project-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    h3 {
      margin-bottom: 0.5rem;
      font-size: 1.4rem;
    }

    p {
      color: #666;
      margin-bottom: 1rem;
      line-height: 1.6;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .tag {
      background: #e8f4fd;
      color: #1976d2;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
    }

    .card-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .launch-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: linear-gradient(135deg, #1976d2 0%, #6a11cb 100%);
      color: white;
      padding: 0.8rem 1.6rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: 0.01em;
      box-shadow: 0 4px 15px rgba(25, 118, 210, 0.45);
      transition: transform 0.18s, box-shadow 0.18s, filter 0.18s;
      animation: pulse-glow 2.5s infinite;

      .btn-icon {
        font-size: 1.1rem;
      }

      &:hover {
        transform: translateY(-2px) scale(1.03);
        box-shadow: 0 8px 28px rgba(106, 17, 203, 0.5);
        filter: brightness(1.08);
        animation: none;
      }

      &:active {
        transform: translateY(0) scale(0.98);
      }
    }

    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 4px 15px rgba(25, 118, 210, 0.45); }
      50%       { box-shadow: 0 4px 24px rgba(106, 17, 203, 0.65); }
    }

    .github-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #f5f5f5;
      color: #333;
      padding: 0.8rem 1.2rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      border: 1px solid #ddd;
      transition: background 0.18s, border-color 0.18s, color 0.18s;

      .github-icon {
        width: 1.1rem;
        height: 1.1rem;
      }

      &:hover {
        background: #24292e;
        color: #fff;
        border-color: #24292e;
      }
    }

    .status-badge {
      display: inline-block;
      background: #f5f5f5;
      color: #666;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
    }
  `]
})
export class ProjectGalleryComponent {
  projects: ProjectCard[] = [
    {
      id: 'ats',
      title: 'Applicant Tracking System',
      description: 'A modern ATS with Kanban pipeline boards to move candidates through screening, interviews, offers, and onboarding.',
      icon: '👥',
      route: '',
      tags: ['Angular', 'Spring Boot', 'PostgreSQL', 'Kanban'],
      status: 'live',
      externalUrl: '/ats/',
      githubUrl: 'https://github.com/clark22134/MyPortfolioWebsite'
    },
    {
      id: 'ecommerce',
      title: 'E-Commerce Platform',
      description: 'A full-featured online store with product catalog, shopping cart, secure checkout, and order management.',
      icon: '🛒',
      route: '',
      tags: ['Angular', 'Spring Boot', 'PostgreSQL', 'Stripe'],
      status: 'live',
      externalUrl: '/ecommerce/',
      githubUrl: 'https://github.com/clark22134/MyPortfolioWebsite'
    },
    {
      id: 'ai-chatbot',
      title: 'AI Chatbot',
      description: 'An intelligent conversational assistant powered by LLMs with context awareness and memory.',
      icon: '🤖',
      route: '/projects/ai-chatbot',
      tags: ['Angular', 'Spring Boot', 'OpenAI', 'WebSocket'],
      status: 'coming-soon'
    },
    {
      id: 'real-time-analytics',
      title: 'Real-Time Analytics',
      description: 'Live dashboard with streaming data visualization, charts, and real-time updates via WebSocket.',
      icon: '📊',
      route: '/projects/real-time-analytics',
      tags: ['Angular', 'Spring Boot', 'WebSocket', 'Charts'],
      status: 'coming-soon'
    },
    {
      id: 'code-playground',
      title: 'Code Playground',
      description: 'An online IDE supporting multiple languages with syntax highlighting and live execution.',
      icon: '💻',
      route: '/projects/code-playground',
      tags: ['Angular', 'Spring Boot', 'Docker', 'Monaco Editor'],
      status: 'coming-soon'
    }
  ];
}
