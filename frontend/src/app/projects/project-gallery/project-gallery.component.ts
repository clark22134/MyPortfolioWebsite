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
            @if (project.status === 'live') {
              <a [routerLink]="project.route" class="launch-btn">Launch Project →</a>
            } @else {
              <span class="status-badge">{{ project.status === 'in-progress' ? 'In Progress' : 'Coming Soon' }}</span>
            }
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

    .launch-btn {
      display: inline-block;
      background: #1976d2;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: background 0.2s;

      &:hover {
        background: #1565c0;
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
      id: 'ai-chatbot',
      title: 'AI Chatbot',
      description: 'An intelligent conversational assistant powered by LLMs with context awareness and memory.',
      icon: '🤖',
      route: '/projects/ai-chatbot',
      tags: ['Angular', 'Spring Boot', 'OpenAI', 'WebSocket'],
      status: 'coming-soon'
    },
    {
      id: 'task-manager',
      title: 'Task Manager',
      description: 'A full-featured project management tool with drag-and-drop boards, deadlines, and team collaboration.',
      icon: '📋',
      route: '/projects/task-manager',
      tags: ['Angular', 'Spring Boot', 'PostgreSQL', 'Drag & Drop'],
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
