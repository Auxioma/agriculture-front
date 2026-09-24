import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
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
});
