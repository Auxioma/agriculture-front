import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, firstValueFrom } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { createAuthServiceMock, type AuthServiceMock } from './auth.service.mock';

describe('authGuard', () => {
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

  it("devrait autoriser l'accès si l'utilisateur est connecté", async () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);

    const canActivate = await TestBed.runInInjectionContext(() =>
      firstValueFrom(authGuard({} as any, {} as any) as any),
    );

    expect(canActivate).toBe(true);
    expect(routerNavigateSpy).not.toHaveBeenCalled();
  });

  it("devrait bloquer l'accès et rediriger vers /auth/login si non connecté", async () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    const canActivate = await TestBed.runInInjectionContext(() =>
      firstValueFrom(authGuard({} as any, {} as any) as any),
    );

    expect(canActivate).toBe(false);
    expect(routerNavigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });
});
