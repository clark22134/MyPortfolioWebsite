import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    title: 'Sign in · HireFlow by Clark'
  },
  {
    path: '',
    loadComponent: () => import('./components/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'Dashboard · HireFlow by Clark'
      },
      {
        path: 'jobs',
        loadComponent: () => import('./pages/jobs/jobs.component').then(m => m.JobsComponent),
        title: 'Jobs · HireFlow by Clark'
      },
      {
        path: 'jobs/:id/pipeline',
        loadComponent: () => import('./pages/pipeline/pipeline.component').then(m => m.PipelineComponent),
        title: 'Pipeline · HireFlow by Clark'
      },
      {
        path: 'talent',
        loadComponent: () => import('./pages/talent/talent.component').then(m => m.TalentComponent),
        title: 'Talent · HireFlow by Clark'
      },
      {
        path: 'candidates/:id',
        loadComponent: () => import('./pages/candidate-detail/candidate-detail.component').then(m => m.CandidateDetailComponent),
        title: 'Candidate · HireFlow by Clark'
      },
      {
        path: 'tasks',
        loadComponent: () => import('./pages/tasks/tasks.component').then(m => m.TasksComponent),
        title: 'Tasks · HireFlow by Clark'
      },
      {
        path: 'users',
        canActivate: [authGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent),
        title: 'Users · HireFlow by Clark'
      },
      { path: '**', redirectTo: '' }
    ]
  }
];
