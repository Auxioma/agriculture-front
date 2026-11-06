import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { FeaturedProducer } from './producer.model';
import { ProducerService } from './producer.service';

describe('ProducerService', () => {
  const url = `${environment.apiURL}/producers/featured`;
  const PRODUCERS = [{ id: 'p1', name: 'Ferme Lemoine' }] as unknown as FeaturedProducer[];
  let service: ProducerService;
  let http: HttpTestingController;
  // l'adresse seule : expectOne(url) compare avec les parametres (?limit=3)
  const featured = () => http.expectOne((r) => r.method === 'GET' && r.url === url);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 3, 10, 0));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProducerService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('lit trois producteurs à la une par défaut', () => {
    let result: unknown;
    service.getFeatured().subscribe((producers) => (result = producers));

    const req = http.expectOne((r) => r.method === 'GET' && r.url === url);
    expect(req.request.params.get('limit')).toBe('3');
    req.flush(PRODUCERS);

    expect(result).toEqual(PRODUCERS);
  });

  it('lit le nombre demandé', () => {
    service.getFeatured(6).subscribe();

    const req = featured();
    expect(req.request.params.get('limit')).toBe('6');
    req.flush([]);
  });

  it('ne les redemande pas quand on revient sur l’accueil, dans les cinq minutes', () => {
    service.getFeatured().subscribe();
    featured().flush(PRODUCERS);

    vi.advanceTimersByTime(5 * 60 * 1000 - 1);
    let result: unknown;
    service.getFeatured().subscribe((producers) => (result = producers));

    http.expectNone((r) => r.url === url);
    expect(result).toEqual(PRODUCERS);
  });

  it('les redemande après cinq minutes', () => {
    service.getFeatured().subscribe();
    featured().flush(PRODUCERS);

    vi.advanceTimersByTime(5 * 60 * 1000);
    service.getFeatured().subscribe();

    featured().flush([]);
  });

  it('ne mélange pas deux nombres demandés', () => {
    service.getFeatured(3).subscribe();
    featured().flush(PRODUCERS);

    service.getFeatured(6).subscribe();

    expect(featured().request.params.get('limit')).toBe('6');
  });

  it('redemande après une erreur, sans attendre la fin des cinq minutes', () => {
    service.getFeatured().subscribe({ error: () => undefined });
    featured().flush(null, { status: 500, statusText: 'Server Error' });

    service.getFeatured().subscribe();

    featured().flush(PRODUCERS);
  });
});
