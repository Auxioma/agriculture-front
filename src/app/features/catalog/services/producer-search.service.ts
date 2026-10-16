import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Coordinates,
  PRODUCERS_PAGE_SIZE,
  ProducerPage,
  ProducerQuery,
  ProducerSummary,
} from '../models/producer-summary.model';

/** En-tête du back (ProducerController) : nombre total de producteurs, toutes pages confondues */
const TOTAL_COUNT_HEADER = 'X-Total-Count';

@Injectable({ providedIn: 'root' })
export class ProducerSearchService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiURL;

  search(query: ProducerQuery, coords?: Coordinates): Observable<ProducerPage> {
    let params = new HttpParams().set('page', query.page).set('pageSize', PRODUCERS_PAGE_SIZE);

    // * Sans catégorie, on n'envoie pas le paramètre : un categoryId vide serait refusé par le back (UUID invalide)
    if (query.categoryId) params = params.set('categoryId', query.categoryId);

    if (query.seasonalOnly) params = params.set('seasonal', true);
    if (query.pickup) params = params.set('pickupAvailable', true);
    if (query.delivery) params = params.set('deliveryAvailable', true);
    if (query.labels.length > 0) params = params.set('labels', query.labels.join(','));
    if (query.verifiedOnly) params = params.set('verifiedOnly', true);
    if (query.minRating !== null) params = params.set('minRating', query.minRating);

    if (coords) {
      params = params
        .set('latitude', coords.latitude)
        .set('longitude', coords.longitude)
        .set('radiusKm', query.radius);
    }

    if (query.sort !== 'relevance' && (query.sort !== 'distance' || coords)) {
      params = params.set('sort', query.sort);
    }

    // * observe: 'response' : on a besoin de la réponse complète pour lire l'en-tête du total, pas seulement du corps.
    return this.http
      .get<ProducerSummary[]>(`${this.apiUrl}/producers`, { params, observe: 'response' })
      .pipe(
        map((response): ProducerPage => {
          const items = response.body ?? [];
          // * En-tête absent ou illisible (ex. CORS) : on retombe sur le nombre reçu, la liste reste utilisable.
          const total = Number(response.headers.get(TOTAL_COUNT_HEADER));
          return { items, total: Number.isFinite(total) && total > 0 ? total : items.length };
        }),
      );
  }
}
