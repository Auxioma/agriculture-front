import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { ZonesService } from './zones.service';

describe('ZonesService', () => {
  const url = `${environment.apiURL}/producer/delivery-zones`;
  let service: ZonesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ZonesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lit les zones du producteur connecté', () => {
    let result: unknown;
    service.list().subscribe((value) => (result = value));

    const call = http.expectOne(url);
    expect(call.request.method).toBe('GET');
    call.flush([{ id: 'z1', radiusKm: '15.00', rules: null }]);

    expect(result).toEqual([{ id: 'z1', radiusKm: '15.00', rules: null }]);
  });

  it('crée une zone avec son rayon et ses conditions', () => {
    service.create({ radiusKm: 15, rules: { frais: '3.00' } }).subscribe();

    const call = http.expectOne(url);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({ radiusKm: 15, rules: { frais: '3.00' } });
  });

  it('modifie une zone sur son identifiant', () => {
    service.update('z1', { radiusKm: 20, rules: null }).subscribe();

    const call = http.expectOne(`${url}/z1`);
    expect(call.request.method).toBe('PUT');
    expect(call.request.body).toEqual({ radiusKm: 20, rules: null });
  });

  it('supprime une zone sur son identifiant', () => {
    service.remove('z1').subscribe();

    const call = http.expectOne(`${url}/z1`);
    expect(call.request.method).toBe('DELETE');
    call.flush(null, { status: 204, statusText: 'No Content' });
  });
});
