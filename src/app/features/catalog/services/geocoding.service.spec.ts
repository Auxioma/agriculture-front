import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Coordinates } from '../models/producer-summary.model';
import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  const adresseUrl = 'https://api-adresse.data.gouv.fr/search/';
  let service: GeocodingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GeocodingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("interroge l'API Adresse avec le texte saisi et un seul résultat", () => {
    service.locate('Avignon').subscribe();

    const req = http.expectOne((r) => r.url === adresseUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('Avignon');
    expect(req.request.params.get('limit')).toBe('1');
    req.flush({ features: [] });
  });

  it("remet les coordonnées GeoJSON [longitude, latitude] dans l'ordre latitude/longitude attendu par le back", () => {
    let result: Coordinates | null | undefined;

    service.locate('Avignon').subscribe((value) => (result = value));
    http
      .expectOne((r) => r.url === adresseUrl)
      .flush({ features: [{ geometry: { coordinates: [4.8057, 43.9493] } }] });

    // * GeoJSON place la longitude en premier : une inversion enverrait le producteur au milieu de l'océan.
    expect(result).toEqual({ latitude: 43.9493, longitude: 4.8057 });
  });

  it('renvoie null quand aucun lieu ne correspond', () => {
    let result: Coordinates | null | undefined;

    service.locate('zzzzzz').subscribe((value) => (result = value));
    http.expectOne((r) => r.url === adresseUrl).flush({ features: [] });

    expect(result).toBeNull();
  });
});
