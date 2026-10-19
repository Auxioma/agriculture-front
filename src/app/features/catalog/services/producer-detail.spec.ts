import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { makeProducerDetail, makeReview, makeReviews } from '../testing/catalog.fixtures';
import { ProducerDetailService } from './producer-detail.service';

describe('ProducerDetailService', () => {
  const apiUrl = environment.apiURL;
  let service: ProducerDetailService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProducerDetailService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('appelle GET /producers/{id}', () => {
    const producer = makeProducerDetail();
    let result: unknown;

    service.getProducer('p1').subscribe((value) => (result = value));
    const req = http.expectOne(`${apiUrl}/producers/p1`);
    req.flush(producer);

    expect(req.request.method).toBe('GET');
    expect(result).toEqual(producer);
  });

  it('appelle GET /producers/{id}/reviews', () => {
    const reviews = makeReviews([makeReview()]);
    let result: unknown;

    service.getReviews('p1').subscribe((value) => (result = value));
    http.expectOne(`${apiUrl}/producers/p1/reviews`).flush(reviews);

    expect(result).toEqual(reviews);
  });

  it("encode l'identifiant : il ne peut pas modifier le chemin de la requête", () => {
    service.getProducer('a/../b').subscribe();

    const req = http.expectOne(`${apiUrl}/producers/${encodeURIComponent('a/../b')}`);
    expect(req.request.url).not.toContain('/../');
    req.flush(makeProducerDetail());
  });
});
