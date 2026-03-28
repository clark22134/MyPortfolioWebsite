import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard - HireFlow'
  },
  {
    path: 'jobs',
    loadComponent: () => import('./pages/jobs/jobs.component').then(m => m.JobsComponent),
    title: 'Jobs - HireFlow'
  },
  {
    path: 'jobs/:id/pipeline',
    loadComponent: () => import('./pages/pipeline/pipeline.component').then(m => m.PipelineComponent),
    title: 'Pipeline - HireFlow'
  },
  {
    path: 'talent',
    loadComponent: () => import('./pages/talent/talent.component').then(m => m.TalentComponent),
    title: 'Talent Pool - HireFlow'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
