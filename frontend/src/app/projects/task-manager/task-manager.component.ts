import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-task-manager',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="project-container">
      <header class="project-header">
        <a routerLink="/projects" class="back-link">← Back to Projects</a>
        <h1>📋 Task Manager</h1>
        <p>Full-featured project management with drag-and-drop boards</p>
      </header>

      <div class="coming-soon-banner">
        <h2>🚧 Under Construction</h2>
        <p>This project is currently being developed. Check back soon!</p>
      </div>

      <div class="preview-section">
        <h3>Planned Features</h3>
        <ul class="feature-list">
          <li>✅ Kanban-style drag-and-drop boards</li>
          <li>✅ Task assignments and deadlines</li>
          <li>✅ Real-time collaboration</li>
          <li>✅ Labels, priorities, and filters</li>
          <li>✅ Activity history and comments</li>
        </ul>
      </div>

      <div class="tech-stack">
        <h3>Technology Stack</h3>
        <div class="tech-tags">
          <span>Angular 18</span>
          <span>Spring Boot 3</span>
          <span>CDK Drag & Drop</span>
          <span>PostgreSQL</span>
          <span>WebSocket</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .project-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    .project-header {
      margin-bottom: 2rem;

      .back-link {
        color: #1976d2;
        text-decoration: none;
        &:hover { text-decoration: underline; }
      }

      h1 { margin: 1rem 0 0.5rem; font-size: 2rem; }
      p { color: #666; }
    }

    .coming-soon-banner {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 2rem;
    }

    .preview-section {
      background: #f9f9f9;
      padding: 1.5rem;
      border-radius: 12px;
      margin-bottom: 2rem;

      h3 { margin-bottom: 1rem; }
    }

    .feature-list {
      list-style: none;
      padding: 0;
      li {
        padding: 0.5rem 0;
        font-size: 1.1rem;
      }
    }

    .tech-stack {
      h3 { margin-bottom: 1rem; }
      .tech-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        span {
          background: #e8f4fd;
          color: #1976d2;
          padding: 0.5rem 1rem;
          border-radius: 20px;
        }
      }
    }
  `]
})
export class TaskManagerComponent {}
