import { Routes } from '@angular/router';

export const TASK_MANAGER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./task-manager.component')
      .then(m => m.TaskManagerComponent)
  }
];
