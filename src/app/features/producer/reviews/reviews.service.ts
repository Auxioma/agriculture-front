import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface Review {
  id: string;
  // prenom et initiale du nom ("Camille R."), null si l'auteur est inconnu : on ecrit alors "Client"
  authorName: string | null;
  rating: number | null;
  comment: string | null;
  // reponse du producteur, visible de tous sous l'avis ; null tant qu'il n'a pas repondu
  producerResponse: string | null;
  createdAt: string;
}

// GET /api/producer/reviews : les avis publies par la moderation, du plus recent au plus ancien
export interface ReviewsSummary {
  // moyenne sur 5 arrondie a une decimale, null sans avis
  averageRating: number | null;
  count: number;
  reviews: Review[];
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  list() {
    return this.http.get<ReviewsSummary>(`${this.apiUrl}/producer/reviews`);
  }

  // route commune : le back verifie que l'avis est bien celui d'un client de ce producteur et qu'il est publie
  respond(id: string, response: string) {
    return this.http.post<{ id: string }>(`${this.apiUrl}/reviews/${id}/response`, { response });
  }
}
