import { Location } from '@angular/common';
import { inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { NEVER } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]), // fournit ActivatedRoute/Router pour routerLink
        provideHttpClient(), // AuthService (injecté par App) a besoin de HttpClient
        provideHttpClientTesting(), // intercepte les appels HTTP réels d'AuthService.initAuthState()
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('nav')).toBeTruthy();
  });
});

describe('App : espace producteur', () => {
  const bootSkeleton = () => document.getElementById('boot-skeleton');

  // withBoot : le squelette que index.html pose avant le demarrage de l'application
  async function setup(routes: Routes, { withBoot = true, startAt = '/' } = {}) {
    if (withBoot) document.body.insertAdjacentHTML('beforeend', '<div id="boot-skeleton"></div>');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    TestBed.inject(Location).go(startAt);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    // la navigation est finie ET affichee : on laisse les rendus se faire
    const settle = async () => {
      await fixture.whenStable();
      fixture.detectChanges();
    };
    // navigation encore en cours (garde qui ne repond pas) : l'application n'est jamais stable, on laisse juste passer un instant
    const tick = async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      fixture.detectChanges();
    };
    return { fixture, router, settle, tick };
  }

  afterEach(() => bootSkeleton()?.remove());

  describe('squelette de index.html', () => {
    it('reste tant que la 1re navigation n’est pas finie', async () => {
      const { router, tick } = await setup([{ path: 'producer', canActivate: [() => NEVER], children: [] }]);

      void router.navigateByUrl('/producer');
      await tick();

      expect(bootSkeleton()).not.toBeNull();
    });

    it('s’efface quand la 1re navigation est finie et affichée', async () => {
      const { router, settle } = await setup([{ path: 'producer', children: [] }]);
      expect(bootSkeleton()).not.toBeNull();

      await router.navigateByUrl('/producer');
      await settle();

      expect(bootSkeleton()).toBeNull();
    });

    it('reste quand la garde renvoie ailleurs : la page d’arrivée n’est pas encore là', async () => {
      const { router, tick } = await setup([
        { path: 'producer', canActivate: [() => inject(Router).createUrlTree(['/auth/login'])], children: [] },
        { path: 'auth/login', canActivate: [() => NEVER], children: [] },
      ]);

      void router.navigateByUrl('/producer');
      await tick();

      expect(bootSkeleton()).not.toBeNull();
    });

    it('s’efface quand la page de redirection est arrivée', async () => {
      const { router, settle } = await setup([
        { path: 'producer', canActivate: [() => inject(Router).createUrlTree(['/auth/login'])], children: [] },
        { path: 'auth/login', children: [] },
      ]);

      await router.navigateByUrl('/producer');
      await settle();

      expect(router.url).toBe('/auth/login');
      expect(bootSkeleton()).toBeNull();
    });

    it('s’efface quand la garde refuse', async () => {
      const { router, settle } = await setup([{ path: 'producer', canActivate: [() => false], children: [] }]);

      await router.navigateByUrl('/producer');
      await settle();

      expect(bootSkeleton()).toBeNull();
    });

    it('s’efface quand la navigation échoue (page qui ne se charge pas)', async () => {
      const { router, settle } = await setup([{ path: 'producer', loadComponent: () => Promise.reject(new Error('chunk')), children: [] }]);

      await router.navigateByUrl('/producer').catch(() => undefined);
      await settle();

      expect(bootSkeleton()).toBeNull();
    });

    it('ne fait rien quand il n’y en a pas (page publique)', async () => {
      const { router, settle } = await setup([{ path: 'about', children: [] }], { withBoot: false });

      await router.navigateByUrl('/about');
      await settle();

      expect(router.url).toBe('/about');
    });
  });

  // l'espace producteur n'a ni la navbar ni le footer du site public ; /producer-space et /producers sont des pages publiques
  describe('navbar et footer', () => {
    it.each([
      ['/producer', false],
      ['/producer?tab=1', false],
      ['/producer#haut', false],
      ['/producer/requests', false],
      ['/producer/subscription?checkout=success', false],
      ['/producer-space', true],
      ['/producers', true],
      ['/legal/producer', true],
      ['/producers/abc', true],
      ['/pricing', true],
    ])('%s : navbar et footer affichés = %s', async (url, shown) => {
      const { fixture, router, settle } = await setup([{ path: '**', children: [] }], { withBoot: false, startAt: url });
      const chrome = () => ({
        navbar: !!(fixture.nativeElement as HTMLElement).querySelector('app-navbar'),
        footer: !!(fixture.nativeElement as HTMLElement).querySelector('app-footer'),
      });
      // d'abord d'apres l'adresse du navigateur, avant la fin de la navigation
      expect(chrome()).toEqual({ navbar: shown, footer: shown });

      await router.navigateByUrl(url);
      await settle();

      expect(chrome()).toEqual({ navbar: shown, footer: shown });
    });
  });
});
