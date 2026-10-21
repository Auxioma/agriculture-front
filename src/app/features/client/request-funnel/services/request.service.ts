import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { CreateRequestPayload } from '../models/request.model';

@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly http = inject(HttpClient);

  /** POST /api/requests → 201 { id } */
  create(payload: CreateRequestPayload) {
    return this.http.post<{ id: string }>(`${environment.apiURL}/requests`, payload);
  }
}

/**
 * Extrait un message lisible d'une erreur API. Deux formats existent côté Symfony :
 * - règles manuelles du contrôleur : { "error": "..." }
 * - validation du DTO (#[MapRequestPayload]) : liste de violations (vérifie le format exact dans l'onglet Réseau).
 */
export function apiErrorMessage(e: HttpErrorResponse): string {
  const body = e.error;
  if (typeof body?.error === 'string') return body.error;
  if (Array.isArray(body?.violations)) {
    return body.violations
      .map((v: { title?: string; message?: string }) => v.title ?? v.message)
      .join(' ');
  }
  return 'Une erreur est survenue. Réessayez dans un instant.';
}
