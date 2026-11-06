import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Favorite } from './favorite.model';
import { FavoriteService } from './favorite.service';
import { FavoritesComponent } from './favorites.component';

function makeFavorite(overrides: Partial<Favorite> = {}): Favorite {
  return {
    id: 'fav-1',
    targetType: 'producer_profile',
    targetId: 'prod-1',
    createdAt: '2026-11-03T10:00:00+00:00',
    target: {
      id: 'prod-1',
      farmName: 'Ferme Dupont',
      slug: 'ferme-dupont',
      city: 'Bordeaux',
      verified: true,
    },
    ...overrides,
  };
}

describe('FavoritesComponent', () => {
  let fixture: ComponentFixture<FavoritesComponent>;
  let el: HTMLElement;
  const favorites = signal<Favorite[]>([]);
  const serviceMock = {
    favorites: favorites.asReadonly(),
    load: vi.fn(),
    remove: vi.fn(),
  };

  /** Crée le composant et attend que afterNextRender ait lancé le chargement */
  async function setup(): Promise<void> {
    fixture = TestBed.createComponent(FavoritesComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    favorites.set([]);
    serviceMock.load.mockReset().mockReturnValue(of([]));
    serviceMock.remove.mockReset().mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      imports: [FavoritesComponent],
      providers: [provideRouter([]), { provide: FavoriteService, useValue: serviceMock }],
    });
  });

  it("affiche « Chargement… » tant que la liste n'est pas arrivée", async () => {
    serviceMock.load.mockReturnValue(NEVER); // la requête ne se termine jamais
    await setup();

    expect(el.textContent).toContain('Chargement');
  });

  it("affiche un message d'erreur si le chargement échoue", async () => {
    serviceMock.load.mockReturnValue(throwError(() => new Error('API down')));
    await setup();

    expect(el.textContent).toContain('Impossible de charger vos favoris');
  });

  it("affiche l'état vide quand il n'y a aucun favori dans l'onglet", async () => {
    await setup();

    expect(el.textContent).toContain('Aucun favori dans cette catégorie');
  });

  it("affiche les producteurs favoris (nom, ville, initiales) dans l'onglet par défaut", async () => {
    favorites.set([makeFavorite()]);
    await setup();

    expect(serviceMock.load).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain('Ferme Dupont');
    expect(el.textContent).toContain('Bordeaux');
    expect(el.textContent).toContain('FD');
  });

  it("n'affiche pas un favori dont la cible a été supprimée (target = null)", async () => {
    favorites.set([makeFavorite({ id: 'orphan', target: null })]);
    await setup();

    expect(el.querySelectorAll('li')).toHaveLength(0);
    expect(el.textContent).toContain('Aucun favori dans cette catégorie');
  });

  it("filtre la liste selon l'onglet actif", async () => {
    favorites.set([
      makeFavorite({ id: 'p1' }),
      makeFavorite({
        id: 'c1',
        targetType: 'category',
        targetId: 'cat-1',
        target: { id: 'cat-1', name: 'Miel', slug: 'miel' },
      }),
    ]);
    await setup();

    // Onglet « Producteurs » : le producteur, pas la catégorie
    expect(el.textContent).toContain('Ferme Dupont');
    expect(el.textContent).not.toContain('Miel');

    // Clic sur le filtre « Catégories »
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('app-filter-tabs button'));
    const categoriesBtn = buttons.find((b) => b.textContent?.includes('Catégories'));

    expect(categoriesBtn).toBeDefined(); // échec lisible si le bouton est absent
    categoriesBtn!.click();
    fixture.detectChanges();

    expect(categoriesBtn!.getAttribute('aria-pressed')).toBe('true');
    expect(el.textContent).toContain('Miel');
    expect(el.textContent).not.toContain('Ferme Dupont');
  });

  it('retire le favori en appelant le service avec son id', async () => {
    favorites.set([makeFavorite({ id: 'fav-42' })]);
    await setup();

    el.querySelector<HTMLButtonElement>('button[aria-label^="Retirer"]')!.click();

    expect(serviceMock.remove).toHaveBeenCalledWith('fav-42');
  });

  describe('link()', () => {
    it("construit l'URL selon le type de cible", async () => {
      await setup();
      const component = fixture.componentInstance;

      expect(component.link(makeFavorite())).toEqual(['/producers', 'ferme-dupont']);
      expect(
        component.link(
          makeFavorite({
            targetType: 'category',
            target: { id: 'cat-1', slug: 'miel', name: 'Miel' },
          }),
        ),
      ).toEqual(['/categories', 'miel']);
      expect(
        component.link(
          makeFavorite({
            targetType: 'product',
            target: { id: 'prod-9', slug: 'pommes', name: 'Pommes' },
          }),
        ),
      ).toEqual(['/producers']);
    });

    // pas de page par produit : un produit en favori mène aux producteurs qui le proposent
    it('mène un produit en favori à /producers?productId=, les autres types sans paramètre', async () => {
      await setup();
      const component = fixture.componentInstance;
      const product = makeFavorite({ targetType: 'product', targetId: 'prod-9', target: { id: 'prod-9', slug: 'pommes', name: 'Pommes' } });
      const category = makeFavorite({ targetType: 'category', target: { id: 'cat-1', slug: 'miel', name: 'Miel' } });

      expect(component.queryParams(product)).toEqual({ productId: 'prod-9' });
      expect(component.queryParams(category)).toBeNull();
    });
  });
});
