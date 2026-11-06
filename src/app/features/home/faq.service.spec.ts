import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { FaqArticle } from './faq.model';
import { FaqService } from './faq.service';

describe('FaqService', () => {
  const url = `${environment.apiURL}/faq`;
  const ARTICLES = [{ id: 'f1', title: 'Est-ce gratuit pour les clients ?' }] as unknown as FaqArticle[];
  let service: FaqService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 3, 10, 0));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(FaqService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('lit la FAQ', () => {
    let result: unknown;
    service.getAll().subscribe((articles) => (result = articles));

    http.expectOne((r) => r.method === 'GET' && r.url === url).flush(ARTICLES);

    expect(result).toEqual(ARTICLES);
  });

  it('ne la redemande pas quand on revient sur une page qui l’affiche, dans les cinq minutes', () => {
    service.getAll().subscribe();
    http.expectOne(url).flush(ARTICLES);

    vi.advanceTimersByTime(5 * 60 * 1000 - 1);
    let result: unknown;
    service.getAll().subscribe((articles) => (result = articles));

    http.expectNone(url);
    expect(result).toEqual(ARTICLES);
  });

  it('la redemande après cinq minutes', () => {
    service.getAll().subscribe();
    http.expectOne(url).flush(ARTICLES);

    vi.advanceTimersByTime(5 * 60 * 1000);
    service.getAll().subscribe();

    http.expectOne(url).flush([]);
  });

  it('redemande après une erreur, sans attendre la fin des cinq minutes', () => {
    service.getAll().subscribe({ error: () => undefined });
    http.expectOne(url).flush(null, { status: 500, statusText: 'Server Error' });

    service.getAll().subscribe();

    http.expectOne(url).flush(ARTICLES);
  });
});
