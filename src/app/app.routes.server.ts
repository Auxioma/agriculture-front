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
  // catalogue : une page par categorie et par producteur, on ne peut pas les lister au moment du build (le build echouait :
  // "getPrerenderParams is missing"). Rendues dans le navigateur, comme legal/:code.
  {
    path: 'categories/:slug',
    renderMode: RenderMode.Client,
  },
  {
    path: 'producers/:id',
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
