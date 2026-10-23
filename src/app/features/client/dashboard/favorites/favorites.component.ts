import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoriteService } from './favorite.service';
import { Favorite, FavoriteType } from './favorite.model';

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

  readonly favorites = signal<Favorite[]>([]);
  readonly activeType = signal<FavoriteType>('producer_profile');
  readonly loading = signal(true);
  readonly error = signal(false);

  // Liste filtrée selon l'onglet actif (recalculée automatiquement)
  readonly visible = computed(() =>
    this.favorites().filter((f) => f.targetType === this.activeType() && f.target !== null),
  );

  constructor() {
    this.service.list().subscribe({
      next: (data) => {
        this.favorites.set(data);
        this.loading.set(false);
      },
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
    return this.label(f)
      .split(' ')
      .filter((w) => w.length > 2) // ignore "de", "des", "&"
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
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

  // Mise à jour optimiste : on retire tout de suite, on restaure si l'API échoue
  remove(fav: Favorite): void {
    const previous = this.favorites();
    this.favorites.set(previous.filter((f) => f.id !== fav.id));
    this.service.remove(fav.id).subscribe({
      error: () => this.favorites.set(previous),
    });
  }
}
