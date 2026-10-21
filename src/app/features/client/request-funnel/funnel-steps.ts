import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RequestDraftStore } from './state/request-draft.store';

export const FUNNEL_BASE = '/requests/new';

// Index 0 = étape 1. Ces segments doivent correspondre à ceux de request-funnel.routes.ts.
export const STEP_PATHS = [
  'product',
  'needs',
  'details',
  'localisation',
  'message',
  'summary',
] as const;

/** URL d'une étape (1 à 6) ou de la page de confirmation. */
export function funnelUrl(step: number | 'sent'): string {
  return step === 'sent' ? `${FUNNEL_BASE}/sent` : `${FUNNEL_BASE}/${STEP_PATHS[step - 1]}`;
}

/** Guard : refuse l'accès à l'étape `step` si les étapes précédentes ne sont pas remplies. */
export const stepGuard =
  (step: number): CanActivateFn =>
  () => {
    const max = inject(RequestDraftStore).maxAccessibleStep();
    return step <= max ? true : inject(Router).parseUrl(funnelUrl(max));
  };
