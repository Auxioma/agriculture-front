import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  const api = environment.apiURL;
  let service: ReviewsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReviewsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lit les avis du producteur connecté sur sa propre route', () => {
    let result: unknown;
    service.list().subscribe((value) => (result = value));

    const call = http.expectOne(`${api}/producer/reviews`);
    expect(call.request.method).toBe('GET');
    call.flush({ averageRating: 4.8, count: 24, reviews: [] });

    expect(result).toEqual({ averageRating: 4.8, count: 24, reviews: [] });
  });

  it("va chercher la page suivante tant que le nombre d'avis annoncé n'est pas atteint, et garde la moyenne", () => {
    let result: { count: number; averageRating: number | null; reviews: { id: string }[] } | undefined;
    service.list().subscribe((value) => (result = value as typeof result));

    http.expectOne(`${api}/producer/reviews`).flush({ averageRating: 4.2, count: 3, reviews: [{ id: 'r1' }, { id: 'r2' }] });
    const second = http.expectOne(`${api}/producer/reviews?page=2`);
    second.flush({ averageRating: 4.2, count: 3, reviews: [{ id: 'r3' }] });

    expect(result?.reviews.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
    expect(result?.count).toBe(3);
    expect(result?.averageRating).toBe(4.2);
  });

  it('répond à un avis sur la route commune, avec le texte en « response »', () => {
    service.respond('r1', 'Merci !').subscribe();

    const call = http.expectOne(`${api}/reviews/r1/response`);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({ response: 'Merci !' });
  });
});
