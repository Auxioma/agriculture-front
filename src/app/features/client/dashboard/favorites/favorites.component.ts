import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoriteService } from './favorite.service';
import { Favorite, FavoriteType } from './favorite.model';
import { SavedSearch } from './saved-search.model';
import { SavedSearchService } from './saved-search.service';
import { initials } from '../../utils/initials';
import { PageHeaderComponent } from '../../ui/page-header.component';
import { FilterTabsComponent } from '../../ui/filter-tabs.component';

// * Les recherches sauvegardées ne sont pas des favoris (pas de cible) : un onglet de plus, une liste à part
type TabKey = FavoriteType | 'saved_search';
type Tab = { key: TabKey; label: string; route: string };

@Component({
  selector: 'app-favorites',
  imports: [RouterLink, PageHeaderComponent, FilterTabsComponent],
  templateUrl: './favorites.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesComponent {
  private readonly service = inject(FavoriteService);
  private readonly savedSearchService = inject(SavedSearchService);

  readonly tabs: Tab[] = [
    { key: 'producer_profile', label: 'Producteurs', route: '/producers' },
    { key: 'product', label: 'Produits', route: '/categories' },
    { key: 'category', label: 'Catégories', route: '/categories' },
    { key: 'saved_search', label: 'Recherches', route: '/producers' },
  ];

  readonly favorites = this.service.favorites;
  readonly activeType = signal<TabKey>('producer_profile');
  readonly loading = signal(true);
  readonly error = signal(false);

  // Liste filtrée selon l'onglet actif (recalculée automatiquement)
  readonly visible = computed(() =>
    this.favorites().filter((f) => f.targetType === this.activeType() && f.target !== null),
  );

  // La liste reste dans le composant : rien ne traîne en mémoire quand un autre utilisateur se connecte
  readonly searches = signal<SavedSearch[]>([]);
  readonly searchesLoading = signal(true);
  readonly searchesError = signal(false);
  readonly searchRemoveFailed = signal(false);

  constructor() {
    this.service.load().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
    this.savedSearchService.list().subscribe({
      next: (list) => {
        this.searches.set(list);
        this.searchesLoading.set(false);
      },
      error: () => {
        this.searchesError.set(true);
        this.searchesLoading.set(false);
      },
    });
  }

  label(f: Favorite): string {
    return f.target?.farmName ?? f.target?.name ?? '';
  }

  initials(f: Favorite): string {
    return initials(this.label(f));
  }

  subtitle(f: Favorite): string {
    return f.target?.city ?? '';
  }

  link(f: Favorite): string[] {
    const slug = f.target!.slug ?? f.target!.id;
    switch (f.targetType) {
      case 'producer_profile':
        return ['/producers', slug];
      case 'product':
        // * pas de page par produit : on mène aux producteurs qui le proposent (voir queryParams)
        return ['/producers'];
      case 'category':
        return ['/categories', slug];
    }
  }

  /** Un produit en favori mène à /producers?productId= ; les autres types n'ont pas de paramètre */
  queryParams(f: Favorite): Record<string, string> | null {
    return f.targetType === 'product' && f.targetId ? { productId: f.targetId } : null;
  }

  remove(fav: Favorite): void {
    this.service.remove(fav.id).subscribe();
  }

  /** Ce que la recherche retient, en une ligne ; la catégorie et le produit sont des identifiants, on ne les nomme pas ici */
  summary(s: SavedSearch): string {
    const c = s.criteria ?? {};
    const parts = [
      c.q ? `« ${c.q} »` : '',
      c.near ? `près de ${c.near}` : '',
      c.categoryId ? 'dans une catégorie' : '',
      c.productId ? 'pour un produit précis' : '',
    ];

    return parts.filter(Boolean).join(', ') || 'Tous les producteurs';
  }

  /** Les paramètres d'adresse que /producers sait relire : relancer la recherche, c'est y retourner */
  searchParams(s: SavedSearch): Record<string, string> {
    const c = s.criteria ?? {};
    const params: Record<string, string> = {};
    if (c.q) params['q'] = c.q;
    if (c.near) params['near'] = c.near;
    if (c.categoryId) params['categoryId'] = c.categoryId;
    if (c.productId) params['productId'] = c.productId;

    return params;
  }

  removeSearch(s: SavedSearch): void {
    this.searchRemoveFailed.set(false);
    this.savedSearchService.remove(s.id).subscribe({
      next: () => this.searches.update((list) => list.filter((x) => x.id !== s.id)),
      error: () => this.searchRemoveFailed.set(true),
    });
  }
}
