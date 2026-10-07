import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'auth/login',
    renderMode: RenderMode.Client,
  },
  {
    path: 'auth/register',
    renderMode: RenderMode.Client,
  },
  {
    path: 'legal/:code',
    renderMode: RenderMode.Client,
  },
  // espace producteur : derriere une connexion, rien a pre-rendre
  {
    path: 'producer',
    renderMode: RenderMode.Client,
  },
  {
    path: 'producer/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
