import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../../../environments/environment';
import { RepliesService } from './replies.service';

const api = environment.apiURL;

describe('RepliesService', () => {
  let service: RepliesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RepliesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("GET /client/requests/{id}/replies lit les réponses d'une demande", () => {
    service.list('req-1').subscribe();

    expect(http.expectOne(`${api}/client/requests/req-1/replies`).request.method).toBe('GET');
  });

  it('POST /client/replies/{id}/accept retient la réponse', () => {
    service.accept('rep-1').subscribe();

    expect(http.expectOne(`${api}/client/replies/rep-1/accept`).request.method).toBe('POST');
  });

  it('POST /client/replies/{id}/decline refuse la réponse', () => {
    service.decline('rep-1').subscribe();

    expect(http.expectOne(`${api}/client/replies/rep-1/decline`).request.method).toBe('POST');
  });

  it('POST /reviews envoie la demande, le producteur, la note et le commentaire', () => {
    const review = { requestId: 'req-1', producerId: 'prod-1', rating: 4, comment: 'Très bien' };
    service.review(review).subscribe();

    const req = http.expectOne(`${api}/reviews`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(review);
  });
});
