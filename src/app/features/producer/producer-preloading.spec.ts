import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PreloadingStrategy, Route } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { appConfig } from '../../app.config';
import { routes } from '../../app.routes';
import { CurrentUser } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { ProducerPreloading } from './producer-preloading';

const user = (roles: string[]): CurrentUser => ({ id: '1', email: 'a@b.c', firstName: 'A', lastName: 'B', roles });

describe('ProducerPreloading', () => {
  const marked: Route = { path: 'requests', data: { preload: true } };

  function setup(current: CurrentUser | null) {
    const currentUser = signal(current);
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { currentUser } }] });
    const strategy = TestBed.inject(ProducerPreloading);
    const load = vi.fn(() => of('chargé'));
    let result: unknown = 'rien';
    const run = (route: Route) => strategy.preload(route, load).subscribe((value) => (result = value));
    return { currentUser, load, run, result: () => result };
  }

  it('charge une page marquée pour un producteur', () => {
    const { load, run, result } = setup(user(['ROLE_PRODUCER']));

    run(marked);

    expect(load).toHaveBeenCalledTimes(1);
    expect(result()).toBe('chargé');
  });

  it('charge aussi pour un membre d’équipe producteur', () => {
    const { load, run } = setup(user(['ROLE_PRODUCER_TEAM']));

    run(marked);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('ne charge pas une page qui n’est pas marquée', () => {
    const { load, run } = setup(user(['ROLE_PRODUCER']));

    run({ path: 'profile/edit' });
    run({ path: 'profile/edit', data: { preload: false } });
    run({ path: 'about', data: {} });

    expect(load).not.toHaveBeenCalled();
  });

  it.each([
    ['un client', user(['ROLE_CLIENT'])],
    ['un visiteur sans compte', null],
  ])('ne charge rien pour %s', (_who, current) => {
    const { load, run, result } = setup(current);

    run(marked);

    expect(load).not.toHaveBeenCalled();
    expect(result()).toBeNull();
  });

  // le router rappelle la stratégie à chaque navigation pour les routes pas encore chargées
  it('charge à l’appel suivant quand le producteur est enfin connu', () => {
    const { currentUser, load, run } = setup(null);
    run(marked);
    expect(load).not.toHaveBeenCalled();

    currentUser.set(user(['ROLE_PRODUCER']));
    run(marked);

    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe('pages préchargées de l’espace producteur', () => {
  it('le router utilise cette stratégie', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });

    expect(TestBed.inject(PreloadingStrategy)).toBeInstanceOf(ProducerPreloading);
  });

  // toutes les routes marquées, avec leur adresse complète
  const markedPaths = (list: Route[], prefix = ''): string[] =>
    list.flatMap((route) => {
      const path = [prefix, route.path].filter((part) => part !== undefined && part !== '').join('/');
      return [...(route.data?.['preload'] ? [path] : []), ...markedPaths(route.children ?? [], path)];
    });

  it('seules les pages les plus ouvertes de l’espace producteur sont marquées', () => {
    expect(markedPaths(routes)).toEqual([
      // 'producer' deux fois : la mise en page, puis le tableau de bord (sa route est vide)
      'producer',
      'producer',
      'producer/requests',
      'producer/requests/:id',
      'producer/messages',
      'producer/messages/:id',
      'producer/subscription',
      'producer/products',
      'producer/profile',
    ]);
  });

  it('le site public ne précharge rien', () => {
    const publicRoutes = routes.filter((route) => route.path !== 'producer');

    expect(markedPaths(publicRoutes)).toEqual([]);
  });
});
