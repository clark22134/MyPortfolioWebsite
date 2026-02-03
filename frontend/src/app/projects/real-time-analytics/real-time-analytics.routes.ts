import { Routes } from '@angular/router';

export const REAL_TIME_ANALYTICS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./real-time-analytics.component')
      .then(m => m.RealTimeAnalyticsComponent)
  }
];
