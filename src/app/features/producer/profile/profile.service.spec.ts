import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  const api = environment.apiURL;
  let service: ProfileService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  // plus aucune requete en suspens a la fin de chaque test
  afterEach(() => http.verify());

  it('lit le profil, les labels, les zones et les horaires ensemble', () => {
    let result: unknown;
    service.getExploitation().subscribe((value) => (result = value));

    http.expectOne(`${api}/producer/profile`).flush({ farmName: 'Ferme Dupont' });
    http.expectOne(`${api}/producer/labels`).flush([{ labelId: 'l1' }]);
    http.expectOne(`${api}/producer/delivery-zones`).flush([{ id: 'z1' }]);
    http.expectOne(`${api}/producer/opening-hours`).flush([{ weekday: 1 }]);

    expect(result).toEqual({
      profile: { farmName: 'Ferme Dupont' },
      labels: [{ labelId: 'l1' }],
      zones: [{ id: 'z1' }],
      openingHours: [{ weekday: 1 }],
    });
  });

  it('envoie la couverture en multipart avec son type', () => {
    const file = new File(['x'], 'ferme.png', { type: 'image/png' });
    service.uploadCover(file).subscribe();

    const req = http.expectOne(`${api}/producer/photos`);
    expect(req.request.method).toBe('POST');
    expect((req.request.body as FormData).get('photo')).toBe(file);
    expect((req.request.body as FormData).get('type')).toBe('cover');
    req.flush({ id: 'p1', url: 'http://localhost/p1.png' }, { status: 201, statusText: 'Created' });
  });

  it('remplace la semaine entiere en une requete', () => {
    const hours = [{ weekday: 1, opensAt: '08:00', closesAt: '12:00' }];
    service.saveHours(hours).subscribe();

    const req = http.expectOne(`${api}/producer/opening-hours`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ hours });
    req.flush([]);
  });

  describe('syncLabels', () => {
    it('revendique ceux qu on vient de cocher et retire ceux qu on decoche, sans toucher aux autres', () => {
      service.syncLabels(['a', 'b']).subscribe();

      http.expectOne(`${api}/producer/labels`).flush([{ labelId: 'b' }, { labelId: 'c' }]);
      const claim = http.expectOne((r) => r.method === 'POST' && r.url === `${api}/producer/labels`);
      expect(claim.request.body).toEqual({ labelId: 'a' });
      claim.flush({}, { status: 201, statusText: 'Created' });
      http.expectOne((r) => r.method === 'DELETE' && r.url === `${api}/producer/labels/c`).flush(null, { status: 204, statusText: 'No Content' });
    });

    it('n ecrit rien quand tout est deja a jour', () => {
      service.syncLabels(['b']).subscribe();

      http.expectOne(`${api}/producer/labels`).flush([{ labelId: 'b' }]);
    });
  });

  describe('syncRadius', () => {
    const zones = [
      { id: 'z15', radiusKm: '15.00', rules: { frais: '3.00' } },
      { id: 'z40', radiusKm: '40.00', rules: { frais: '6.00', minimum: '45.00' } },
    ];

    it('cree une zone quand il n y en a aucune', () => {
      service.syncRadius(20).subscribe();

      http.expectOne(`${api}/producer/delivery-zones`).flush([]);
      const req = http.expectOne((r) => r.method === 'POST' && r.url === `${api}/producer/delivery-zones`);
      expect(req.request.body).toEqual({ radiusKm: 20 });
      req.flush({}, { status: 201, statusText: 'Created' });
    });

    it('ne fait rien sans zone et sans rayon', () => {
      service.syncRadius(null).subscribe();

      http.expectOne(`${api}/producer/delivery-zones`).flush([]);
    });

    it('modifie la plus grande zone en gardant ses frais, et laisse les autres', () => {
      service.syncRadius(25).subscribe();

      http.expectOne(`${api}/producer/delivery-zones`).flush(zones);
      const req = http.expectOne((r) => r.method === 'PUT' && r.url === `${api}/producer/delivery-zones/z40`);
      expect(req.request.body).toEqual({ radiusKm: 25, rules: { frais: '6.00', minimum: '45.00' } });
      req.flush({});
    });

    it('ne fait rien quand le rayon est deja celui de la plus grande zone', () => {
      service.syncRadius(40).subscribe();

      http.expectOne(`${api}/producer/delivery-zones`).flush(zones);
    });

    it('supprime la plus grande zone quand le rayon est vide', () => {
      service.syncRadius(null).subscribe();

      http.expectOne(`${api}/producer/delivery-zones`).flush(zones);
      http.expectOne((r) => r.method === 'DELETE' && r.url === `${api}/producer/delivery-zones/z40`).flush(null, { status: 204, statusText: 'No Content' });
    });
  });
});
