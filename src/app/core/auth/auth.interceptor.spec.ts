import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { createAuthServiceMock, type AuthServiceMock } from './auth.service.mock';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let authServiceMock: AuthServiceMock & {
    getToken: ReturnType<typeof vi.fn<AuthService['getToken']>>;
  };
  let nextSpy: ReturnType<typeof vi.fn<HttpHandlerFn>>;

  beforeEach(() => {
    authServiceMock = {
      ...createAuthServiceMock(),
      getToken: vi.fn(),
    };

    nextSpy = vi.fn((req: HttpRequest<unknown>) => of({} as HttpEvent<unknown>));

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    });
  });

  it('devrait ajouter le header Authorization si un token existe', () => {
    authServiceMock.getToken.mockReturnValue('fake-jwt-token');
    const req = new HttpRequest('GET', '/api/me');

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, nextSpy);
    });

    const forwardedRequest = nextSpy.mock.calls[0][0];
    expect(forwardedRequest.headers.get('Authorization')).toBe('Bearer fake-jwt-token');
  });

  it('ne devrait pas ajouter de header Authorization si aucun token', () => {
    authServiceMock.getToken.mockReturnValue(null);
    const req = new HttpRequest('GET', '/api/me');

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, nextSpy);
    });

    const forwardedRequest = nextSpy.mock.calls[0][0];
    expect(forwardedRequest.headers.has('Authorization')).toBe(false);
  });

  describe('lectures publiques du back', () => {
    const forwarded = (method: string, path: string) => {
      authServiceMock.getToken.mockReturnValue('fake-jwt-token');

      TestBed.runInInjectionContext(() => {
        authInterceptor(new HttpRequest(method as 'GET', `${environment.apiURL}${path}`, method === 'GET' ? undefined : {}), nextSpy);
      });

      return nextSpy.mock.calls[0][0];
    };

    it.each([
      '/categories',
      '/categories?sort=popular&limit=5',
      '/products',
      '/products/p1',
      '/labels',
      '/units',
      '/faq',
      '/legal',
      '/legal/cgu',
      '/producers',
      '/producers?page=2',
      '/producers/featured?limit=3',
      '/producers/ferme-dupont',
      '/producers/ferme-dupont/reviews',
    ])('n envoie pas le jeton pour GET %s', (path) => {
      expect(forwarded('GET', path).headers.has('Authorization')).toBe(false);
    });

    it.each([
      '/me',
      '/notifications?limit=20',
      '/producer/dashboard',
      '/producer/products',
      '/subscription/plans',
      '/conversations',
    ])('envoie le jeton pour GET %s', (path) => {
      expect(forwarded('GET', path).headers.get('Authorization')).toBe('Bearer fake-jwt-token');
    });

    it('envoie le jeton pour une écriture, même sur une adresse publique en lecture', () => {
      expect(forwarded('POST', '/producers/p1/favorite').headers.get('Authorization')).toBe('Bearer fake-jwt-token');
    });

    it('ne confond pas /categories avec un autre début de chemin', () => {
      expect(forwarded('GET', '/categories-admin').headers.get('Authorization')).toBe('Bearer fake-jwt-token');
      expect(forwarded('GET', '/producers-export').headers.get('Authorization')).toBe('Bearer fake-jwt-token');
    });

    it('ne touche qu’aux adresses de l’API : une autre origine garde son comportement habituel', () => {
      authServiceMock.getToken.mockReturnValue('fake-jwt-token');
      // * même longueur que l'adresse de l'API, pour qu'un début de chemin pareil ne s'y trompe pas
      const elsewhere = 'https://autre.example.org'.padEnd(environment.apiURL.length, 'x');

      TestBed.runInInjectionContext(() => {
        authInterceptor(new HttpRequest('GET', `${elsewhere}/faq`), nextSpy);
      });

      expect(nextSpy.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer fake-jwt-token');
    });
  });

  it('ne devrait pas modifier la requête originale (immutabilité)', () => {
    authServiceMock.getToken.mockReturnValue('fake-jwt-token');
    const req = new HttpRequest('GET', '/api/me');

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, nextSpy);
    });

    expect(req.headers.has('Authorization')).toBe(false);
  });
});
