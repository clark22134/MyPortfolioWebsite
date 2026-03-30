import { Routes } from '@angular/router';

export const CODE_PLAYGROUND_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./code-playground.component')
      .then(m => m.CodePlaygroundComponent)
  }
];
