import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../../core/auth/auth.service';
import { FavoriteButtonComponent } from './favorite-button.component';
import { Favorite } from './favorite.model';
import { FavoriteService } from './favorite.service';

function makeFavorite(overrides: Partial<Favorite> = {}): Favorite {
  return {
    id: 'fav-1',
    targetType: 'producer_profile',
    targetId: 'prod-1',
    createdAt: '2026-11-03T10:00:00+00:00',
    target: null,
    ...overrides,
  };
}

describe('FavoriteButtonComponent', () => {
  let fixture: ComponentFixture<FavoriteButtonComponent>;
  let button: HTMLButtonElement;

  const favorites = signal<Favorite[]>([]);
  const serviceMock = {
    favorites: favorites.asReadonly(),
    ensureLoaded: vi.fn(),
    load: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  };
  const authMock = { isAuthenticated: vi.fn() };
  const routerMock = { navigate: vi.fn(), url: '/producers/ferme-dupont' };

  async function setup(): Promise<void> {
    fixture = TestBed.createComponent(FavoriteButtonComponent);
    fixture.componentRef.setInput('targetType', 'producer_profile');
    fixture.componentRef.setInput('targetId', 'prod-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    button = fixture.nativeElement.querySelector('button');
  }

  beforeEach(() => {
    sessionStorage.clear();
    favorites.set([]);
    authMock.isAuthenticated.mockReset().mockReturnValue(true);
    routerMock.navigate.mockReset();
    serviceMock.ensureLoaded.mockReset();
    serviceMock.load.mockReset().mockReturnValue(of([]));
    serviceMock.add.mockReset().mockReturnValue(of({ id: 'fav-new' }));
    serviceMock.remove.mockReset().mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      imports: [FavoriteButtonComponent],
      providers: [
        { provide: FavoriteService, useValue: serviceMock },
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  describe('affichage', () => {
    it("cœur vide quand la cible n'est pas en favori", async () => {
      await setup();

      expect(button.getAttribute('aria-pressed')).toBe('false');
      expect(button.getAttribute('aria-label')).toBe('Ajouter aux favoris');
      expect(button.querySelector('svg')!.getAttribute('fill')).toBe('none');
    });

    it('cœur rempli quand la cible est en favori', async () => {
      favorites.set([makeFavorite()]);
      await setup();

      expect(button.getAttribute('aria-pressed')).toBe('true');
      expect(button.getAttribute('aria-label')).toBe('Retirer des favoris');
      expect(button.querySelector('svg')!.getAttribute('fill')).toBe('currentColor');
    });

    it('ne confond pas deux cibles de types différents ayant le même id', async () => {
      favorites.set([makeFavorite({ targetType: 'product', targetId: 'prod-1' })]);
      await setup();

      expect(button.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('chargement', () => {
    it("charge les favoris si l'utilisateur est connecté", async () => {
      await setup();
      expect(serviceMock.ensureLoaded).toHaveBeenCalled();
    });

    it("ne charge rien si l'utilisateur est déconnecté", async () => {
      authMock.isAuthenticated.mockReturnValue(false);
      await setup();
      expect(serviceMock.ensureLoaded).not.toHaveBeenCalled();
    });
  });

  describe('clic', () => {
    it("redirige vers /auth/login (avec returnUrl) si l'utilisateur est déconnecté", async () => {
      authMock.isAuthenticated.mockReturnValue(false);
      await setup();

      button.click();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/producers/ferme-dupont' },
      });
      expect(serviceMock.add).not.toHaveBeenCalled();
      expect(serviceMock.remove).not.toHaveBeenCalled();
    });

    it("ajoute le favori quand la cible n'en est pas un", async () => {
      await setup();

      button.click();

      expect(serviceMock.add).toHaveBeenCalledWith('producer_profile', 'prod-1');
      expect(serviceMock.remove).not.toHaveBeenCalled();
    });

    it('retire le favori (avec son id) quand la cible en est un', async () => {
      favorites.set([makeFavorite({ id: 'fav-99' })]);
      await setup();

      button.click();

      expect(serviceMock.remove).toHaveBeenCalledWith('fav-99');
      expect(serviceMock.add).not.toHaveBeenCalled();
    });

    it('désactive le bouton pendant la requête puis le réactive', async () => {
      const pending$ = new Subject<{ id: string }>();
      serviceMock.add.mockReturnValue(pending$);
      await setup();

      button.click();
      fixture.detectChanges();
      expect(button.disabled).toBe(true);

      pending$.next({ id: 'fav-new' });
      pending$.complete(); // finalize() s'exécute à la fin du flux
      fixture.detectChanges();
      expect(button.disabled).toBe(false);
    });

    it('recharge la liste sur une erreur 409 (état local désynchronisé)', async () => {
      serviceMock.add.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409, statusText: 'Conflict' })),
      );
      await setup();

      button.click();

      expect(serviceMock.load).toHaveBeenCalledTimes(1);
    });

    it('ne recharge pas la liste sur une autre erreur (ex. 500)', async () => {
      serviceMock.add.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
      );
      await setup();

      button.click();

      expect(serviceMock.load).not.toHaveBeenCalled();
    });

    it("le dit à côté du cœur quand la modification échoue, et l'efface au clic suivant", async () => {
      serviceMock.add.mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
      );
      await setup();

      button.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role=alert]')?.textContent).toContain('Impossible de modifier');

      button.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull();
    });

    it('renvoie vers la connexion, en retenant la cible, quand la session a expiré (401)', async () => {
      serviceMock.add.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
      );
      await setup();

      button.click();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/producers/ferme-dupont' },
      });
      expect(JSON.parse(sessionStorage.getItem('pendingFavorite')!)).toMatchObject({ type: 'producer_profile', id: 'prod-1' });
      expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull();
    });
  });

  // un clic sans être connecté ne doit pas être perdu : la connexion ramène sur la page, le favori s'ajoute
  describe('favori demandé avant la connexion', () => {
    const remember = (overrides: Record<string, unknown> = {}) =>
      sessionStorage.setItem('pendingFavorite', JSON.stringify({ type: 'producer_profile', id: 'prod-1', at: Date.now(), ...overrides }));

    it('retient la cible quand on clique sans être connecté', async () => {
      authMock.isAuthenticated.mockReturnValue(false);
      await setup();

      button.click();

      expect(JSON.parse(sessionStorage.getItem('pendingFavorite')!)).toMatchObject({ type: 'producer_profile', id: 'prod-1' });
    });

    it('ajoute le favori retenu au retour connecté, une seule fois', async () => {
      remember();
      await setup();

      expect(serviceMock.load).toHaveBeenCalledTimes(1);
      expect(serviceMock.add).toHaveBeenCalledWith('producer_profile', 'prod-1');
      expect(sessionStorage.getItem('pendingFavorite')).toBeNull();
    });

    it("n'ajoute rien quand la cible est déjà en favori", async () => {
      remember();
      favorites.set([makeFavorite()]);
      await setup();

      expect(serviceMock.add).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('pendingFavorite')).toBeNull();
    });

    it("laisse la demande à l'autre bouton quand la cible est un autre producteur", async () => {
      remember({ id: 'autre-producteur' });
      await setup();

      expect(serviceMock.add).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('pendingFavorite')).not.toBeNull();
    });

    it('jette une demande vieille de plus de dix minutes', async () => {
      remember({ at: Date.now() - 11 * 60 * 1000 });
      await setup();

      expect(serviceMock.add).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('pendingFavorite')).toBeNull();
    });

    it("ne fait rien tant qu'on n'est pas connecté", async () => {
      remember();
      authMock.isAuthenticated.mockReturnValue(false);
      await setup();

      expect(serviceMock.add).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('pendingFavorite')).not.toBeNull();
    });

    it("le dit quand l'ajout rejoué échoue", async () => {
      remember();
      serviceMock.add.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      await setup();

      expect(fixture.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    });
  });
});
