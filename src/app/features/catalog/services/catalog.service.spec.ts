import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { makeCategory, makeLabel, makeProduct } from '../testing/catalog.fixtures';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  const apiUrl = environment.apiURL;
  let service: CatalogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogService);
    http = TestBed.inject(HttpTestingController);
  });

  // * Vérifie qu'aucune requête inattendue ne reste en suspens à la fin de chaque test.
  afterEach(() => http.verify());

  it('appelle GET /categories sans paramètre par défaut', () => {
    const categories = [makeCategory()];
    let result: unknown;

    service.getCategories().subscribe((value) => (result = value));
    const req = http.expectOne(`${apiUrl}/categories`);
    req.flush(categories);

    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    expect(result).toEqual(categories);
  });

  it('transmet la langue demandée aux catégories', () => {
    service.getCategories('en').subscribe();

    const req = http.expectOne((r) => r.url === `${apiUrl}/categories`);
    expect(req.request.params.get('locale')).toBe('en');
    req.flush([]);
  });

  it('appelle GET /products, avec la langue si elle est demandée', () => {
    service.getProducts().subscribe();
    const withoutLocale = http.expectOne(`${apiUrl}/products`);
    expect(withoutLocale.request.params.keys()).toEqual([]);
    withoutLocale.flush([makeProduct()]);

    service.getProducts('es').subscribe();
    const withLocale = http.expectOne((r) => r.url === `${apiUrl}/products`);
    expect(withLocale.request.params.get('locale')).toBe('es');
    withLocale.flush([]);
  });

  it('appelle GET /labels, avec la langue si elle est demandée', () => {
    service.getLabels().subscribe();
    const withoutLocale = http.expectOne(`${apiUrl}/labels`);
    expect(withoutLocale.request.params.keys()).toEqual([]);
    withoutLocale.flush([makeLabel()]);

    service.getLabels('de').subscribe();
    const withLocale = http.expectOne((r) => r.url === `${apiUrl}/labels`);
    expect(withLocale.request.params.get('locale')).toBe('de');
    withLocale.flush([]);
  });
});
