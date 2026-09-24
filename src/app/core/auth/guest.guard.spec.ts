import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, firstValueFrom } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { guestGuard } from './guest.guard';
import { AuthService } from './auth.service';
import { createAuthServiceMock, type AuthServiceMock } from './auth.service.mock';

describe('guestGuard', () => {
  let authServiceMock: AuthServiceMock;
  let routerNavigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authServiceMock = createAuthServiceMock();
    authServiceMock.initAuthState.mockReturnValue(of(undefined));
    routerNavigateSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: { navigate: routerNavigateSpy } },
      ],
    });
  });

  it("devrait autoriser l'accès si l'utilisateur n'est pas connecté", async () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    const canActivate = await TestBed.runInInjectionContext(() =>
      firstValueFrom(guestGuard({} as any, {} as any) as any),
    );

    expect(canActivate).toBe(true);
    expect(routerNavigateSpy).not.toHaveBeenCalled();
  });

  it("devrait bloquer l'accès et rediriger vers / si l'utilisateur est déjà connecté", async () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);

    const canActivate = await TestBed.runInInjectionContext(() =>
      firstValueFrom(guestGuard({} as any, {} as any) as any),
    );

    expect(canActivate).toBe(false);
    expect(routerNavigateSpy).toHaveBeenCalledWith(['/']);
  });

  it("devrait attendre la résolution d'initAuthState avant de décider", async () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    let resolved = false;

    // Simule un appel HTTP encore en cours : la résolution intervient après un micro-délai
    authServiceMock.initAuthState.mockReturnValue(
      new Observable<void>((subscriber) => {
        setTimeout(() => {
          resolved = true;
          subscriber.next();
          subscriber.complete();
        }, 0);
      }),
    );

    await TestBed.runInInjectionContext(() =>
      firstValueFrom(guestGuard({} as any, {} as any) as any),
    );

    expect(resolved).toBe(true);
  });
});
