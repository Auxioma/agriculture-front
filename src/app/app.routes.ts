import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './features/auth/auth.routes';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'how-it-works',
    loadComponent: () =>
      import('./features/how-it-works/how-it-works.component').then((m) => m.HowItWorksComponent),
  },
  {
    path: 'producer-space',
    loadComponent: () =>
      import('./features/producer-space/producer-space.component').then((m) => m.ProducerSpaceComponent),
  },
  { path: 'auth', children: AUTH_ROUTES },
];
