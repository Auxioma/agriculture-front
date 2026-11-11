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
  // espace client
  { path: 'client', renderMode: RenderMode.Client },
  { path: 'client/**', renderMode: RenderMode.Client },
  { path: 'requests/**', renderMode: RenderMode.Client },
  // pages publiques a parametre : rendu serveur a la demande (pas de liste a pre-rendre)
  { path: 'categories/:slug', renderMode: RenderMode.Server },
  { path: 'producers/:id', renderMode: RenderMode.Server },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
