import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <nav class="sidebar" aria-label="Main navigation">
        <div class="sidebar-brand">
          <span class="brand-icon">H</span>
          <span class="brand-text">HireFlow</span>
        </div>
        <ul class="nav-links">
          <li>
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
              <span class="nav-icon">📊</span> Dashboard
            </a>
          </li>
          <li>
            <a routerLink="/jobs" routerLinkActive="active">
              <span class="nav-icon">💼</span> Jobs
            </a>
          </li>
          <li>
            <a routerLink="/talent" routerLinkActive="active">
              <span class="nav-icon">👥</span> Talent
            </a>
          </li>
        </ul>
      </nav>
      <main id="main-content" class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      width: 220px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      padding: 1.5rem 0;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 1rem;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      background: var(--accent);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.1rem;
    }

    .brand-text {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .nav-links {
      list-style: none;
      padding: 0 0.75rem;
    }

    .nav-links a {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.75rem;
      border-radius: var(--radius);
      color: var(--text-secondary);
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.15s;
    }

    .nav-links a:hover {
      background: rgba(99, 102, 241, 0.1);
      color: var(--text-primary);
    }

    .nav-links a.active {
      background: rgba(99, 102, 241, 0.15);
      color: var(--accent);
    }

    .nav-icon {
      font-size: 1.1rem;
    }

    .main-content {
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
    }

    @media (max-width: 768px) {
      .app-layout {
        flex-direction: column;
      }
      .sidebar {
        width: 100%;
        flex-direction: row;
        padding: 0.75rem;
        border-right: none;
        border-bottom: 1px solid var(--border);
        flex-wrap: nowrap;
        overflow-x: auto;
      }
      .sidebar-brand {
        border-bottom: none;
        margin-bottom: 0;
        padding: 0 0.75rem 0 0;
        flex-shrink: 0;
      }
      .nav-links {
        display: flex;
        gap: 0.25rem;
        padding: 0;
        flex-shrink: 0;
      }
      .main-content {
        padding: 1rem;
      }
    }

    @media (max-width: 480px) {
      .sidebar {
        padding: 0.5rem 0.75rem;
      }
      .brand-text {
        display: none;
      }
      .nav-links a {
        gap: 0;
        padding: 0.5rem 0.6rem;
        font-size: 0;
      }
      .nav-icon {
        font-size: 1.3rem;
        min-width: 1.3rem;
        text-align: center;
      }
    }
  `]
})
export class AppComponent {}
