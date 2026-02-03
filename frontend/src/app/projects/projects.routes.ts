import { Routes } from '@angular/router';

/**
 * Routes for interactive portfolio projects.
 * Each project is lazy-loaded for optimal performance.
 *
 * To add a new project:
 * 1. Create a folder under /projects/your-project-name/
 * 2. Add the lazy-loaded route below
 * 3. Create the corresponding backend module in backend/src/main/java/com/portfolio/backend/projects/
 */
export const projectRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./project-gallery/project-gallery.component')
      .then(m => m.ProjectGalleryComponent),
    title: 'Interactive Projects'
  },
  {
    path: 'ai-chatbot',
    loadChildren: () => import('./ai-chatbot/ai-chatbot.routes')
      .then(m => m.AI_CHATBOT_ROUTES),
    title: 'AI Chatbot'
  },
  {
    path: 'task-manager',
    loadChildren: () => import('./task-manager/task-manager.routes')
      .then(m => m.TASK_MANAGER_ROUTES),
    title: 'Task Manager'
  },
  {
    path: 'real-time-analytics',
    loadChildren: () => import('./real-time-analytics/real-time-analytics.routes')
      .then(m => m.REAL_TIME_ANALYTICS_ROUTES),
    title: 'Real-Time Analytics'
  },
  {
    path: 'code-playground',
    loadChildren: () => import('./code-playground/code-playground.routes')
      .then(m => m.CODE_PLAYGROUND_ROUTES),
    title: 'Code Playground'
  }
];
