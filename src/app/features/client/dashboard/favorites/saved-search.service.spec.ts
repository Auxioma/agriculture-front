import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../../environments/environment';
import { SavedSearch } from './saved-search.model';
import { SavedSearchService } from './saved-search.service';

const URL = `${environment.apiURL}/saved-searches`;

function makeSavedSearch(overrides: Partial<SavedSearch> = {}): SavedSearch {
  return {
    id: 'search-1',
    name: 'Tomates, Lyon',
    criteria: { q: 'tomates', near: 'Lyon' },
    notificationsEnabled: false,
    createdAt: '2026-11-06T10:00:00+00:00',
    ...overrides,
  };
}

describe('SavedSearchService', () => {
  let service: SavedSearchService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SavedSearchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Échoue si une requête inattendue est restée sans réponse
    http.verify();
  });

  it('list() appelle GET /saved-searches et renvoie la liste', () => {
    let result: SavedSearch[] = [];
    service.list().subscribe((list) => (result = list));

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('GET');
    req.flush([makeSavedSearch()]);

    expect(result).toEqual([makeSavedSearch()]);
  });

  it('create() envoie le nom et les critères en POST /saved-searches', () => {
    let result: SavedSearch | undefined;
    service
      .create('Tomates, Lyon', { q: 'tomates', near: 'Lyon' })
      .subscribe((created) => (result = created));

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Tomates, Lyon',
      criteria: { q: 'tomates', near: 'Lyon' },
    });
    req.flush(makeSavedSearch(), { status: 201, statusText: 'Created' });

    expect(result?.id).toBe('search-1');
  });

  it('remove() appelle DELETE /saved-searches/{id}', () => {
    let done = false;
    service.remove('search-1').subscribe(() => (done = true));

    const req = http.expectOne(`${URL}/search-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(done).toBe(true);
  });
});
