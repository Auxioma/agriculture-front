import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoriteService } from './favorite.service';
import { Favorite, FavoriteType } from './favorite.model';
import { initials } from '../../utils/initials';

type Tab = { type: FavoriteType; label: string; route: string };

@Component({
  selector: 'app-favorites',
  imports: [RouterLink],
  templateUrl: './favorites.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesComponent {
  private readonly service = inject(FavoriteService);

  readonly tabs: Tab[] = [
    { type: 'producer_profile', label: 'Producteurs', route: '/producers' },
    { type: 'product', label: 'Produits', route: '/categories' },
    { type: 'category', label: 'Catégories', route: '/categories' },
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
    const slug = f.target!.slug;
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
