import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  const api = environment.apiURL;
  let service: SettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lit les preferences', () => {
    let result: unknown;
    service.getPreferences().subscribe((value) => (result = value));

    http.expectOne(`${api}/me/preferences`).flush({ locale: 'fr' });

    expect(result).toEqual({ locale: 'fr' });
  });

  it('n envoie que le champ modifie', () => {
    service.updatePreferences({ notifications: { payment_failed: false } }).subscribe();

    const req = http.expectOne(`${api}/me/preferences`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ notifications: { payment_failed: false } });
    req.flush({});
  });

  it('change le mot de passe avec l actuel et le nouveau', () => {
    service.changePassword('ancien', 'nouveau-mot-de-passe').subscribe();

    const req = http.expectOne(`${api}/me/password`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ currentPassword: 'ancien', newPassword: 'nouveau-mot-de-passe' });
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('demande l export en blob', () => {
    let result: unknown;
    service.exportData().subscribe((value) => (result = value));

    const req = http.expectOne(`${api}/me/export`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['{}']));

    expect(result).toBeInstanceOf(Blob);
  });

  it('supprime le compte avec un corps : le mot de passe et l acceptation de la resiliation', () => {
    service.deleteAccount('motdepasse123', true).subscribe();

    const req = http.expectOne(`${api}/me`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ password: 'motdepasse123', acceptSubscriptionCancellation: true });
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
