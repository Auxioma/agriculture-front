import { computed, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Page, hasMore } from './paged';

/**
 * Une liste qui se charge page par page (« Voir plus ») : les éléments déjà chargés, le total de toutes les pages et l'état de la
 * page suivante. Charge la première page à sa création ; `loadMore()` ajoute la suivante, sans répéter un élément déjà là (une demande
 * arrivée entre-temps décale les pages).
 */
export class PagedList<T> {
  /** undefined : la première page arrive ; null : elle n'est pas arrivée (erreur) ; sinon les éléments chargés */
  readonly items = signal<T[] | null | undefined>(undefined);
  /** Le total de toutes les pages ; null quand le back ne l'a pas donné (la liste reçue est alors entière) */
  readonly total = signal<number | null>(null);
  readonly loadingMore = signal(false);
  /** La dernière page demandée n'est pas arrivée : la liste déjà chargée reste, on peut réessayer */
  readonly moreFailed = signal(false);

  readonly loaded = computed(() => this.items()?.length ?? 0);
  readonly hasMore = computed(() => hasMore(this.loaded(), this.total()));

  private pagesLoaded = 1;

  constructor(
    private readonly fetchPage: (page: number) => Observable<Page<T>>,
    private readonly keyOf: (item: T) => string,
  ) {
    this.fetchPage(1).subscribe({
      next: (page) => {
        this.items.set(page.items);
        this.total.set(page.total);
      },
      error: () => this.items.set(null),
    });
  }

  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) return;
    this.loadingMore.set(true);
    this.moreFailed.set(false);
    this.fetchPage(this.pagesLoaded + 1).subscribe({
      next: (page) => {
        const known = new Set((this.items() ?? []).map(this.keyOf));
        this.items.update((list) => [
          ...(list ?? []),
          ...page.items.filter((item) => !known.has(this.keyOf(item))),
        ]);
        this.total.set(page.total);
        this.pagesLoaded++;
        this.loadingMore.set(false);
      },
      error: () => {
        this.moreFailed.set(true);
        this.loadingMore.set(false);
      },
    });
  }
}
