import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ProducerDetail, ProducerReviews } from '../models/producer-detail.model';

@Injectable({ providedIn: 'root' })
export class ProducerDetailService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiURL;

  /** GET /api/producers/{id} : 404 si l'identifiant est inconnu, mal formé, ou le producteur désactivé */
  getProducer(id: string) {
    return this.http.get<ProducerDetail>(`${this.apiUrl}/producers/${encodeURIComponent(id)}`);
  }

  /** GET /api/producers/{id}/reviews : avis publiés, du plus récent au plus ancien, avec la moyenne */
  getReviews(id: string) {
    return this.http.get<ProducerReviews>(
      `${this.apiUrl}/producers/${encodeURIComponent(id)}/reviews`,
    );
  }
}
