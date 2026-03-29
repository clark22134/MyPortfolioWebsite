import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard - HireFlow by Clark'
  },
  {
    path: 'jobs',
    loadComponent: () => import('./pages/jobs/jobs.component').then(m => m.JobsComponent),
    title: 'Jobs - HireFlow by Clark'
  },
  {
    path: 'jobs/:id/pipeline',
    loadComponent: () => import('./pages/pipeline/pipeline.component').then(m => m.PipelineComponent),
    title: 'Pipeline - HireFlow by Clark'
  },
  {
    path: 'talent',
    loadComponent: () => import('./pages/talent/talent.component').then(m => m.TalentComponent),
    title: 'Talent Pool - HireFlow by Clark'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
