import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, defer, expand, last, map } from 'rxjs';
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

  // les avis sont pagines (cent par page) : on va chercher les suivants tant que le nombre d'avis annonce n'est pas atteint. La moyenne et
  // le nombre sont ceux de tous les avis publies, quelle que soit la page ; la premiere requete est la meme qu'avant, sans page
  list(): Observable<ReviewsSummary> {
    const url = `${this.apiUrl}/producer/reviews`;
    interface Loaded {
      summary: ReviewsSummary;
      page: number;
      received: number;
    }
    const fetch = (page: number, before: Review[]): Observable<Loaded> =>
      this.http.get<ReviewsSummary>(url, { params: page > 1 ? { page } : {} }).pipe(
        map((summary) => ({
          summary: { ...summary, reviews: [...before, ...summary.reviews] },
          page,
          received: summary.reviews.length,
        })),
      );

    return defer(() => fetch(1, [])).pipe(
      expand((loaded) =>
        loaded.received > 0 && loaded.summary.reviews.length < loaded.summary.count
          ? fetch(loaded.page + 1, loaded.summary.reviews)
          : EMPTY,
      ),
      last(),
      map((loaded) => loaded.summary),
    );
  }

  // route commune : le back verifie que l'avis est bien celui d'un client de ce producteur et qu'il est publie
  respond(id: string, response: string) {
    return this.http.post<{ id: string }>(`${this.apiUrl}/reviews/${id}/response`, { response });
  }
}
