import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Coordinates, ProducerQuery, ProducerSummary } from '../models/producer-summary.model';

@Injectable({ providedIn: 'root' })
export class ProducerSearchService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiURL;

  search(query: ProducerQuery, coords?: Coordinates) {
    let params = new HttpParams();

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

    return this.http.get<ProducerSummary[]>(`${this.apiUrl}/producers`, { params });
  }
}
