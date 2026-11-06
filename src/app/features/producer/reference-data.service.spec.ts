import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { LabelsService } from './labels/labels.service';
import { ProductsService } from './products/products.service';
import { ProfileService } from './profile/profile.service';
import { ReferenceDataService } from './reference-data.service';
import { RequestsService } from './requests/requests.service';

const FIVE_MINUTES = 5 * 60 * 1000;

describe('ReferenceDataService', () => {
  const api = environment.apiURL;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 3, 10, 0));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  const lists = ['labels', 'units', 'categories', 'products'] as const;
  // les 4 listes n'ont pas le meme type : on les lit toutes comme des Observable<unknown>
  const read = (name: (typeof lists)[number]) => TestBed.inject(ReferenceDataService)[name]() as Observable<unknown>;

  it.each(lists)('lit /%s', (name) => {
    let result: unknown;
    read(name).subscribe((list) => (result = list));

    http.expectOne((r) => r.method === 'GET' && r.url === `${api}/${name}`).flush([{ id: 'a1' }]);

    expect(result).toEqual([{ id: 'a1' }]);
  });

  it.each(lists)('ne redemande pas /%s avant 5 minutes, la redemande ensuite', (name) => {
    read(name).subscribe();
    http.expectOne(`${api}/${name}`).flush([]);

    vi.advanceTimersByTime(FIVE_MINUTES - 1);
    read(name).subscribe();
    http.expectNone(`${api}/${name}`);

    vi.advanceTimersByTime(1);
    read(name).subscribe();
    http.expectOne(`${api}/${name}`).flush([]);
  });

  it('garde chaque liste à part', () => {
    const reference = TestBed.inject(ReferenceDataService);
    reference.labels().subscribe();
    reference.units().subscribe();

    http.expectOne(`${api}/labels`).flush([]);
    http.expectOne(`${api}/units`).flush([]);
  });

  describe('les pages de l’espace se partagent la même lecture', () => {
    it('labels : produits, profil et page des labels', () => {
      TestBed.inject(ProductsService).getLabels().subscribe();
      TestBed.inject(ProfileService).getCatalogLabels().subscribe();
      TestBed.inject(LabelsService).getPage().subscribe();

      // expectOne échoue s'il y en a deux
      http.expectOne(`${api}/labels`).flush([]);
      http.expectOne(`${api}/producer/profile`).flush({});
      http.expectOne(`${api}/producer/labels`).flush([]);
    });

    it('unités : produits et réponse à une demande', () => {
      TestBed.inject(ProductsService).getUnits().subscribe();
      TestBed.inject(RequestsService).getUnits().subscribe();

      http.expectOne(`${api}/units`).flush([]);
    });

    it('catégories et produits du catalogue : page des produits', () => {
      const products = TestBed.inject(ProductsService);
      products.getCategories().subscribe();
      products.getCategories().subscribe();
      products.getCatalog().subscribe();
      products.getCatalog().subscribe();

      http.expectOne(`${api}/categories`).flush([]);
      http.expectOne(`${api}/products`).flush([]);
    });
  });
});
