import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './features/auth/auth.routes';
import { producerGuard } from './features/producer/producer.guard';

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
  {
    path: 'about',
    loadComponent: () => import('./features/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'faq',
    loadComponent: () => import('./features/faq/faq.component').then((m) => m.FaqComponent),
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: 'resources',
    loadComponent: () =>
      import('./features/resources/resources.component').then((m) => m.ResourcesComponent),
  },
  {
    path: 'legal/:code',
    loadComponent: () => import('./features/legal/legal.component').then((m) => m.LegalComponent),
  },
  {
    path: 'producer',
    canActivate: [producerGuard],
    loadComponent: () =>
      import('./features/producer/producer-layout/producer-layout.component').then((m) => m.ProducerLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/producer/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
    ],
  },
  { path: 'auth', children: AUTH_ROUTES },
];
