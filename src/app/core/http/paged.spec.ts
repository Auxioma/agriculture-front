import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAllPages, getPage, hasMore, Page } from './paged';

const URL = '/api/things';

describe('paged', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  const total = (n: number) => ({ headers: { 'X-Total-Count': String(n) } });

  describe('getPage', () => {
    it('rend les éléments et le total de toutes les pages', () => {
      let page: Page<number> | undefined;
      getPage<number>(http, URL, { page: 2, pageSize: 10 }).subscribe((p) => (page = p));

      const req = backend.expectOne((r) => r.url === URL);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('pageSize')).toBe('10');
      req.flush([1, 2], total(25));

      expect(page).toEqual({ items: [1, 2], total: 25 });
    });

    it("le total est null sans l'en-tête, ou avec un en-tête illisible", () => {
      const pages: Page<number>[] = [];
      getPage<number>(http, URL).subscribe((p) => pages.push(p));
      backend.expectOne(URL).flush([1]);
      getPage<number>(http, URL).subscribe((p) => pages.push(p));
      backend.expectOne(URL).flush([1], { headers: { 'X-Total-Count': 'beaucoup' } });

      expect(pages.map((p) => p.total)).toEqual([null, null]);
    });
  });

  describe('hasMore', () => {
    it('reste des éléments seulement quand le total est connu et pas atteint', () => {
      expect(hasMore(20, 45)).toBe(true);
      expect(hasMore(45, 45)).toBe(false);
      expect(hasMore(20, null)).toBe(false);
    });
  });

  describe('getAllPages', () => {
    it("une liste qui tient en une page : une seule requête, la même qu'avant (sans page)", () => {
      let result: number[] | undefined;
      getAllPages<number>(http, URL).subscribe((r) => (result = r));

      const req = backend.expectOne(URL);
      expect(req.request.params.keys()).toEqual([]);
      req.flush([1, 2, 3], total(3));

      expect(result).toEqual([1, 2, 3]);
    });

    it('sans en-tête (liste non paginée), la page reçue est la liste entière', () => {
      let result: number[] | undefined;
      getAllPages<number>(http, URL).subscribe((r) => (result = r));

      backend.expectOne(URL).flush([1, 2]);

      expect(result).toEqual([1, 2]);
    });

    it("charge les pages suivantes jusqu'au total, dans l'ordre", () => {
      let result: number[] | undefined;
      getAllPages<number>(http, URL, { type: 'a' }).subscribe((r) => (result = r));

      backend.expectOne((r) => r.url === URL && !r.params.has('page')).flush([1, 2], total(5));
      const second = backend.expectOne((r) => r.url === URL && r.params.get('page') === '2');
      expect(second.request.params.get('type')).toBe('a');
      second.flush([3, 4], total(5));
      backend.expectOne((r) => r.url === URL && r.params.get('page') === '3').flush([5], total(5));

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it("s'arrête sur une page vide, même si le total annoncé n'est pas atteint", () => {
      let result: number[] | undefined;
      getAllPages<number>(http, URL).subscribe((r) => (result = r));

      backend.expectOne((r) => !r.params.has('page')).flush([1, 2], total(9));
      backend.expectOne((r) => r.params.get('page') === '2').flush([], total(9));

      expect(result).toEqual([1, 2]);
    });

    it("transmet l'erreur d'une page", () => {
      let failed = false;
      getAllPages<number>(http, URL).subscribe({ error: () => (failed = true) });

      backend.expectOne((r) => !r.params.has('page')).flush([1], total(3));
      backend
        .expectOne((r) => r.params.get('page') === '2')
        .flush('oups', { status: 500, statusText: 'Server Error' });

      expect(failed).toBe(true);
    });
  });
});
