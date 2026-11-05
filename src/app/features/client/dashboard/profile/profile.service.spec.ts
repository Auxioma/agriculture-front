import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../../environments/environment';
import { AddressPayload } from './profile.model';
import { ProfileService } from './profile.service';

const api = environment.apiURL;

const address: AddressPayload = {
  label: 'Domicile',
  address1: '12 rue de la Paix',
  address2: null,
  city: 'Lyon',
  postalCode: '69000',
  countryCode: 'FR',
  isDefault: true,
};

describe('ProfileService', () => {
  let service: ProfileService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify()); // échoue si une requête n'a pas été "consommée" par le test

  it('GET /me', () => {
    service.me().subscribe();
    expect(http.expectOne(`${api}/me`).request.method).toBe('GET');
  });

  it('GET /me/preferences', () => {
    service.preferences().subscribe();
    expect(http.expectOne(`${api}/me/preferences`).request.method).toBe('GET');
  });

  it('PATCH /me/preferences envoie uniquement le patch', () => {
    service.updatePreferences({ currency: 'GBP' }).subscribe();
    const req = http.expectOne(`${api}/me/preferences`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ currency: 'GBP' });
  });

  it('GET /me/addresses', () => {
    service.addresses().subscribe();
    expect(http.expectOne(`${api}/me/addresses`).request.method).toBe('GET');
  });

  it('POST /me/addresses', () => {
    service.createAddress(address).subscribe();
    const req = http.expectOne(`${api}/me/addresses`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(address);
  });

  it('PUT /me/addresses/{id}', () => {
    service.updateAddress('abc', address).subscribe();
    const req = http.expectOne(`${api}/me/addresses/abc`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(address);
  });

  it('DELETE /me/addresses/{id}', () => {
    service.deleteAddress('abc').subscribe();
    expect(http.expectOne(`${api}/me/addresses/abc`).request.method).toBe('DELETE');
  });

  it('PUT /me/password', () => {
    service.changePassword({ currentPassword: 'a', newPassword: 'b' }).subscribe();
    const req = http.expectOne(`${api}/me/password`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ currentPassword: 'a', newPassword: 'b' });
  });

  it('GET /me/export', () => {
    service.exportData().subscribe();
    expect(http.expectOne(`${api}/me/export`).request.method).toBe('GET');
  });

  it('DELETE /me', () => {
    service.deleteAccount().subscribe();
    expect(http.expectOne(`${api}/me`).request.method).toBe('DELETE');
  });
});
