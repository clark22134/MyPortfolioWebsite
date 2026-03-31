import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { InteractiveProjectsComponent } from './components/interactive-projects/interactive-projects.component';
import { ContactComponent } from './components/contact/contact.component';
import { AccessibilityStatementComponent } from './components/accessibility-statement/accessibility-statement.component';
import { CredentialsComponent } from './components/credentials/credentials.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Home' },
  { path: 'login', component: LoginComponent, title: 'Login' },
  { path: 'projects', component: ProjectsComponent, title: 'Full-Stack Projects' },
  { path: 'credentials', component: CredentialsComponent, title: 'Credentials' },
  { path: 'contact', component: ContactComponent, title: 'Contact' },
  { path: 'accessibility', component: AccessibilityStatementComponent, title: 'Accessibility' },
  {
    path: 'docs',
    loadComponent: () => import('./components/documentation/documentation.component')
      .then(m => m.DocumentationComponent),
    title: 'Documentation'
  },
  {
    path: 'docs/:slug',
    loadComponent: () => import('./components/documentation/doc-viewer.component')
      .then(m => m.DocViewerComponent),
    title: 'Documentation'
  },
  { path: 'admin/interactive-projects', component: InteractiveProjectsComponent, canActivate: [authGuard], title: 'Interactive Projects' },

  // Interactive portfolio projects (lazy-loaded)
  {
    path: 'interactive',
    loadChildren: () => import('./projects/projects.routes')
      .then(m => m.projectRoutes),
    title: 'Interactive Projects'
  },

  { path: '**', redirectTo: '' }
];
