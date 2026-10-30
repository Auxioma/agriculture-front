import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoriteService } from './favorite.service';
import { Favorite, FavoriteType } from './favorite.model';
import { initials } from '../../utils/initials';
import { PageHeaderComponent } from '../../ui/page-header.component';
import { FilterTabsComponent } from '../../ui/filter-tabs.component';

type Tab = { key: FavoriteType; label: string; route: string };

@Component({
  selector: 'app-favorites',
  imports: [RouterLink, PageHeaderComponent, FilterTabsComponent],
  templateUrl: './favorites.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesComponent {
  private readonly service = inject(FavoriteService);

  readonly tabs: Tab[] = [
    { key: 'producer_profile', label: 'Producteurs', route: '/producers' },
    { key: 'product', label: 'Produits', route: '/categories' },
    { key: 'category', label: 'Catégories', route: '/categories' },
  ];

  readonly favorites = this.service.favorites;
  readonly activeType = signal<FavoriteType>('producer_profile');
  readonly loading = signal(true);
  readonly error = signal(false);

  // Liste filtrée selon l'onglet actif (recalculée automatiquement)
  readonly visible = computed(() =>
    this.favorites().filter((f) => f.targetType === this.activeType() && f.target !== null),
  );

  constructor() {
    this.service.load().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.error.set(true);
        this.loading.set(false);
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
        return ['/products', slug];
      case 'category':
        return ['/categories', slug];
    }
  }

  remove(fav: Favorite): void {
    this.service.remove(fav.id).subscribe();
  }
}
