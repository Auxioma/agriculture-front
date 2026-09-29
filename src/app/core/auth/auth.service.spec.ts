import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerNavigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    routerNavigateSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Router, useValue: { navigate: routerNavigateSpy } },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('login', () => {
    it('devrait stocker le token en localStorage après une connexion réussie', () => {
      service.login({ email: 'test@test.com', password: 'password1234' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiURL}/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush({ token: 'fake-jwt-token' });

      expect(localStorage.getItem('access_token')).toBe('fake-jwt-token');
    });
  });

  describe('getToken', () => {
    it('devrait renvoyer null si aucun token stocké', () => {
      expect(service.getToken()).toBeNull();
    });

    it('devrait renvoyer le token stocké', () => {
      localStorage.setItem('access_token', 'existing-token');
      expect(service.getToken()).toBe('existing-token');
    });
  });

  describe('initAuthState', () => {
    it("ne devrait faire aucun appel HTTP si aucun token n'existe", () => {
      service.initAuthState().subscribe((result) => {
        expect(result).toBeUndefined();
      });

      httpMock.expectNone(`${environment.apiURL}/me`);
    });

    it('devrait appeler /me si un token existe', () => {
      localStorage.setItem('access_token', 'existing-token');

      service.initAuthState().subscribe();

      const req = httpMock.expectOne(`${environment.apiURL}/me`);
      req.flush({
        id: '1',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['ROLE_CLIENT'],
      });

      expect(service.isAuthenticated()).toBe(true);
    });

    it('devrait déconnecter proprement si le token est invalide (401)', () => {
      localStorage.setItem('access_token', 'expired-token');

      service.initAuthState().subscribe();

      const req = httpMock.expectOne(`${environment.apiURL}/me`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(routerNavigateSpy).not.toHaveBeenCalled();

      httpMock.expectOne(`${environment.apiURL}/auth/logout`).flush(null);
    });

    it("ne devrait déclencher qu'un seul appel HTTP même avec plusieurs abonnés (shareReplay)", () => {
      localStorage.setItem('access_token', 'existing-token');

      // 2 abonnements simultanés
      service.initAuthState().subscribe();
      service.initAuthState().subscribe();

      httpMock.expectOne(`${environment.apiURL}/me`).flush({
        id: '1',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['ROLE_CLIENT'],
      });
    });
  });

  describe('logout', () => {
    it('devrait nettoyer le token et rediriger vers /auth/login', () => {
      localStorage.setItem('access_token', 'some-token');

      service.logout();

      httpMock.expectOne(`${environment.apiURL}/auth/logout`).flush(null);
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(routerNavigateSpy).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('registerClient', () => {
    it('devrait envoyer une requête POST vers /auth/register-client avec le bon payload', () => {
      const payload = {
        email: 'test@test.com',
        password: 'password1234',
        firstName: 'Jean',
        lastName: 'Dupont',
      };

      service.registerClient(payload).subscribe();

      const req = httpMock.expectOne(`${environment.apiURL}/auth/register-client`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ id: 'user-1' });
    });

    it("devrait propager l'erreur 409 (email déjà utilisé) sans la transformer", () => {
      const payload = {
        email: 'test@test.com',
        password: 'password1234',
        firstName: 'Jean',
        lastName: 'Dupont',
      };
      let receivedError: HttpErrorResponse | undefined;

      service.registerClient(payload).subscribe({
        error: (err) => (receivedError = err),
      });

      const req = httpMock.expectOne(`${environment.apiURL}/auth/register-client`);
      req.flush(
        { error: 'Un compte existe déjà avec cet email.' },
        { status: 409, statusText: 'Conflict' },
      );

      expect(receivedError?.status).toBe(409);
    });
  });

  describe('registerProducer', () => {
    it('devrait envoyer une requête POST vers /auth/register-producer avec le bon payload', () => {
      const payload = {
        email: 'jean@ferme.com',
        password: 'password1234',
        firstName: 'Jean',
        lastName: 'Dupont',
        farmName: 'Ferme du Soleil',
        countryCode: 'FR',
      };

      service.registerProducer(payload).subscribe();

      const req = httpMock.expectOne(`${environment.apiURL}/auth/register-producer`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ id: 'user-2' });
    });

    it("devrait propager l'erreur 422 (pays inconnu) sans la transformer", () => {
      const payload = {
        email: 'jean@ferme.com',
        password: 'password1234',
        firstName: 'Jean',
        lastName: 'Dupont',
        farmName: 'Ferme du Soleil',
        countryCode: 'XX',
      };
      let receivedError: HttpErrorResponse | undefined;

      service.registerProducer(payload).subscribe({
        error: (err) => (receivedError = err),
      });

      const req = httpMock.expectOne(`${environment.apiURL}/auth/register-producer`);
      req.flush({ error: 'Pays inconnu.' }, { status: 422, statusText: 'Unprocessable Entity' });

      expect(receivedError?.status).toBe(422);
    });
  });

  describe('forgotPassword', () => {
    it("devrait envoyer une requête POST vers /auth/forgot-password avec l'email", () => {
      service.forgotPassword({ email: 'test@test.com' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiURL}/auth/forgot-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'test@test.com' });
      req.flush(null);
    });

    it("devrait résoudre avec succès même si l'API renvoie 200 pour un email inexistant", () => {
      let succeeded = false;

      service.forgotPassword({ email: 'inconnu@test.com' }).subscribe({
        next: () => (succeeded = true),
      });

      const req = httpMock.expectOne(`${environment.apiURL}/auth/forgot-password`);
      req.flush(null, { status: 200, statusText: 'OK' });

      expect(succeeded).toBe(true);
    });

    it("devrait propager l'erreur 429 (trop de tentatives)", () => {
      let receivedError: HttpErrorResponse | undefined;

      service.forgotPassword({ email: 'test@test.com' }).subscribe({
        error: (err) => (receivedError = err),
      });

      const req = httpMock.expectOne(`${environment.apiURL}/auth/forgot-password`);
      req.flush(
        { error: 'Trop de tentatives, réessayez plus tard.' },
        { status: 429, statusText: 'Too Many Requests' },
      );

      expect(receivedError?.status).toBe(429);
    });
  });

  describe('resetPassword', () => {
    it('devrait envoyer une requête POST vers /auth/reset-password avec le token et le nouveau mot de passe', () => {
      const payload = { token: 'abc123', newPassword: 'nouveauMotDePasse1234' };

      service.resetPassword(payload).subscribe();

      const req = httpMock.expectOne(`${environment.apiURL}/auth/reset-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(null);
    });

    it("devrait propager l'erreur 422 (token invalide ou expiré)", () => {
      let receivedError: HttpErrorResponse | undefined;

      service.resetPassword({ token: 'expired', newPassword: 'nouveauMotDePasse1234' }).subscribe({
        error: (err) => (receivedError = err),
      });

      const req = httpMock.expectOne(`${environment.apiURL}/auth/reset-password`);
      req.flush(
        { error: 'Token invalide ou expiré.' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      expect(receivedError?.status).toBe(422);
    });
  });
});
