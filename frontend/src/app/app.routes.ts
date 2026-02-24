import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { InteractiveProjectsComponent } from './components/interactive-projects/interactive-projects.component';
import { ContactComponent } from './components/contact/contact.component';
import { AccessibilityStatementComponent } from './components/accessibility-statement/accessibility-statement.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'projects', component: ProjectsComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'accessibility', component: AccessibilityStatementComponent },
  { path: 'admin/interactive-projects', component: InteractiveProjectsComponent },

  // Interactive portfolio projects (lazy-loaded)
  {
    path: 'interactive',
    loadChildren: () => import('./projects/projects.routes')
      .then(m => m.projectRoutes),
    title: 'Interactive Projects'
  },

  { path: '**', redirectTo: '' }
];
