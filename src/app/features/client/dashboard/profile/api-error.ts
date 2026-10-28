import { HttpErrorResponse } from '@angular/common/http';

/**
 * Transforme une erreur HTTP en message lisible.
 * Gère les 2 formats de l'API : { error: "..." } (nos contrôleurs) et { violations: [...] } (validation Symfony).
 */
export function apiErrorMessage(
  err: unknown,
  fallback = 'Une erreur est survenue. Réessayez.',
): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 429) return 'Trop de tentatives, réessayez plus tard.';

  const body = err.error;
  if (body && typeof body.error === 'string') return body.error;
  if (Array.isArray(body?.violations) && typeof body.violations[0]?.title === 'string') {
    return body.violations[0].title;
  }
  return fallback;
}
