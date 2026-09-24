import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { createAuthServiceMock, type AuthServiceMock } from './auth.service.mock';

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

  it('ne devrait pas modifier la requête originale (immutabilité)', () => {
    authServiceMock.getToken.mockReturnValue('fake-jwt-token');
    const req = new HttpRequest('GET', '/api/me');

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, nextSpy);
    });

    expect(req.headers.has('Authorization')).toBe(false);
  });
});
