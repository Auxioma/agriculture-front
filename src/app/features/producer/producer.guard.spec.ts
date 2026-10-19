import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import { describe, it, expect } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { CurrentUser } from '../../core/auth/auth.models';
import { producerGuard } from './producer.guard';

describe('producerGuard', () => {
  async function run(user: CurrentUser | null): Promise<boolean | UrlTree> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { initAuthState: () => of(void 0), currentUser: signal(user) } },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      producerGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;
    return firstValueFrom(result);
  }

  const user = (roles: string[]): CurrentUser => ({ id: '1', email: 'a@b.c', firstName: 'A', lastName: 'B', roles });

  it('renvoie un visiteur non connecté vers la page de connexion', async () => {
    const result = await run(null);

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/auth/login');
  });

  it('renvoie un client connecté vers l\'accueil', async () => {
    const result = await run(user(['ROLE_CLIENT']));

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });

  it('laisse passer un producteur, et un membre d\'équipe producteur', async () => {
    expect(await run(user(['ROLE_PRODUCER']))).toBe(true);

    TestBed.resetTestingModule();
    expect(await run(user(['ROLE_PRODUCER_TEAM']))).toBe(true);
  });
});
