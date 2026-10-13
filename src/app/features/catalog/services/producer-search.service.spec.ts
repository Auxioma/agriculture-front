import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { Coordinates, ProducerQuery } from '../models/producer-summary.model';
import { makeProducerSummary } from '../testing/catalog.fixtures';
import { ProducerSearchService } from './producer-search.service';

/**
 * Ces tests figent le CONTRAT avec GET /api/producers (ProducerController::listProducers) : noms des paramètres,
 * valeurs envoyées, et surtout ce qui n'est PAS envoyé (filtres inactifs).
 */
describe('ProducerSearchService', () => {
  const apiUrl = environment.apiURL;
  const avignon: Coordinates = { latitude: 43.9493, longitude: 4.8057 };
  const noFilter: ProducerQuery = {
    categoryId: 'cat-1',
    location: '',
    radius: 25,
    seasonalOnly: false,
    pickup: false,
    delivery: false,
    labels: [],
    verifiedOnly: false,
    minRating: null,
    sort: 'relevance',
  };
  let service: ProducerSearchService;
  let http: HttpTestingController;

  /** Lance la recherche et renvoie la requête interceptée (réponse vide) */
  function search(query: Partial<ProducerQuery> = {}, coords?: Coordinates): TestRequest {
    service.search({ ...noFilter, ...query }, coords).subscribe();
    const req = http.expectOne((r) => r.url === `${apiUrl}/producers`);
    req.flush([]);

    return req;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProducerSearchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("n'envoie que categoryId quand aucun filtre n'est actif", () => {
    const req = search();

    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual(['categoryId']);
    expect(req.request.params.get('categoryId')).toBe('cat-1');
  });

  it('renvoie la réponse du serveur telle quelle (un tableau de producteurs)', () => {
    const producers = [makeProducerSummary()];
    let result: unknown;

    service.search(noFilter).subscribe((value) => (result = value));
    http.expectOne((r) => r.url === `${apiUrl}/producers`).flush(producers);

    expect(result).toEqual(producers);
  });

  it('envoie les filtres booléens sous les noms attendus par le back', () => {
    const req = search({ seasonalOnly: true, pickup: true, delivery: true, verifiedOnly: true });

    expect(req.request.params.get('seasonal')).toBe('true');
    expect(req.request.params.get('pickupAvailable')).toBe('true');
    expect(req.request.params.get('deliveryAvailable')).toBe('true');
    expect(req.request.params.get('verifiedOnly')).toBe('true');
  });

  it('joint les labels par des virgules', () => {
    const req = search({ labels: ['bio', 'local'] });

    expect(req.request.params.get('labels')).toBe('bio,local');
  });

  it('envoie la note minimale', () => {
    const req = search({ minRating: 4 });

    expect(req.request.params.get('minRating')).toBe('4');
  });

  it('envoie position et rayon ensemble quand on a des coordonnées', () => {
    const req = search({ radius: 50 }, avignon);

    expect(req.request.params.get('latitude')).toBe('43.9493');
    expect(req.request.params.get('longitude')).toBe('4.8057');
    expect(req.request.params.get('radiusKm')).toBe('50');
  });

  it("n'envoie ni position ni rayon sans coordonnées, même si un rayon est choisi", () => {
    const req = search({ radius: 50 });

    expect(req.request.params.has('latitude')).toBe(false);
    expect(req.request.params.has('longitude')).toBe(false);
    expect(req.request.params.has('radiusKm')).toBe(false);
  });

  it("n'envoie pas le tri par défaut (pertinence)", () => {
    expect(search({ sort: 'relevance' }).request.params.has('sort')).toBe(false);
  });

  it('envoie les tris popularité et nouveauté', () => {
    expect(search({ sort: 'popularity' }).request.params.get('sort')).toBe('popularity');
    expect(search({ sort: 'newest' }).request.params.get('sort')).toBe('newest');
  });

  it('envoie le tri par distance uniquement avec des coordonnées', () => {
    expect(search({ sort: 'distance' }, avignon).request.params.get('sort')).toBe('distance');
    expect(search({ sort: 'distance' }).request.params.has('sort')).toBe(false);
  });
});
