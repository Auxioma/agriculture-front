import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../../environments/environment';
import { Favorite } from './favorite.model';
import { FavoriteService } from './favorite.service';

const URL = `${environment.apiURL}/favorites`;

function makeFavorite(overrides: Partial<Favorite> = {}): Favorite {
  return {
    id: 'fav-1',
    targetType: 'producer_profile',
    targetId: 'prod-1',
    createdAt: '2026-11-03T10:00:00+00:00',
    target: {
      id: 'prod-1',
      farmName: 'Ferme Dupont',
      slug: 'ferme-dupont',
      city: 'Bordeaux',
      verified: true,
    },
    ...overrides,
  };
}

describe('FavoriteService', () => {
  let service: FavoriteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FavoriteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Échoue si une requête inattendue est restée sans réponse
    http.verify();
  });

  it('commence avec une liste vide', () => {
    expect(service.favorites()).toEqual([]);
  });

  describe('load()', () => {
    it('appelle GET /favorites et met à jour le signal', () => {
      const data = [makeFavorite()];

      service.load().subscribe();
      const req = http.expectOne(URL);
      expect(req.request.method).toBe('GET');
      req.flush(data);

      expect(service.favorites()).toEqual(data);
    });
  });

  describe('ensureLoaded()', () => {
    it("ne charge la liste qu'une seule fois, même appelée plusieurs fois", () => {
      service.ensureLoaded();
      service.ensureLoaded();
      service.ensureLoaded();

      http.expectOne(URL).flush([]); // une seule requête, sinon expectOne échoue
    });

    it('autorise une nouvelle tentative après une erreur', () => {
      service.ensureLoaded();
      http.expectOne(URL).flush('erreur', { status: 500, statusText: 'Server Error' });

      service.ensureLoaded(); // deuxième tentative
      http.expectOne(URL).flush([makeFavorite()]);

      expect(service.favorites()).toHaveLength(1);
    });
  });

  describe('add()', () => {
    it("envoie POST /favorites avec le type et l'id de la cible", () => {
      service.add('product', 'prod-42').subscribe();

      const req = http.expectOne(URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ targetType: 'product', targetId: 'prod-42' });
      req.flush({ id: 'fav-new' });
    });

    it("ajoute le favori en tête de liste avec l'id renvoyé par l'API", () => {
      service['_favorites'].set([makeFavorite({ id: 'fav-old' })]);

      service.add('producer_profile', 'prod-2').subscribe();
      http.expectOne(URL).flush({ id: 'fav-new' });

      const list = service.favorites();
      expect(list).toHaveLength(2);
      expect(list[0]).toMatchObject({
        id: 'fav-new',
        targetType: 'producer_profile',
        targetId: 'prod-2',
        target: null, // l'API ne renvoie pas le détail à l'ajout
      });
      expect(list[1].id).toBe('fav-old');
    });

    it("ne modifie pas la liste si l'API répond par une erreur", () => {
      service.add('category', 'cat-1').subscribe({ error: () => undefined });
      http
        .expectOne(URL)
        .flush({ error: 'Déjà dans vos favoris.' }, { status: 409, statusText: 'Conflict' });

      expect(service.favorites()).toEqual([]);
    });
  });

  describe('remove()', () => {
    it('envoie DELETE /favorites/:id et retire le favori de la liste', () => {
      service['_favorites'].set([makeFavorite({ id: 'a' }), makeFavorite({ id: 'b' })]);

      service.remove('a').subscribe();
      const req = http.expectOne(`${URL}/a`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(service.favorites().map((f) => f.id)).toEqual(['b']);
    });

    it('garde la liste intacte si la suppression échoue', () => {
      service['_favorites'].set([makeFavorite({ id: 'a' })]);

      service.remove('a').subscribe({ error: () => undefined });
      http.expectOne(`${URL}/a`).flush('erreur', { status: 404, statusText: 'Not Found' });

      expect(service.favorites()).toHaveLength(1);
    });
  });

  describe('clear()', () => {
    it('vide la liste et permet un nouveau chargement', () => {
      service['_favorites'].set([makeFavorite()]);
      service.ensureLoaded();
      http.expectOne(URL).flush([makeFavorite()]);

      service.clear();
      expect(service.favorites()).toEqual([]);

      service.ensureLoaded(); // recharge, car `loaded` a été remis à false
      http.expectOne(URL).flush([]);
    });
  });
});
