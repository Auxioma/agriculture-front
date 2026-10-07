import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, debounceTime, filter, map, of, startWith, switchMap } from 'rxjs';
import {
  Coordinates,
  Label,
  ProducerQuery,
  ProducerSort,
  ProducerSummary,
} from '../../models/producer-summary.model';
import { CatalogService } from '../../services/catalog.service';
import { GeocodingService } from '../../services/geocoding.service';
import { ProducerSearchService } from '../../services/producer-search.service';

/** Les états possibles de la liste : un seul signal, impossible d'être « chargé ET en erreur » */
type SearchState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'location-not-found' }
  | { status: 'ready'; items: ProducerSummary[] };

const DEFAULT_RADIUS_KM = 25;

@Component({
  selector: 'app-category-producers',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './category-producers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryProducersComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  private readonly geocoding = inject(GeocodingService);
  private readonly producerSearch = inject(ProducerSearchService);

  // ── Catégorie courante, retrouvée grâce au slug de l'URL (/categories/:slug) ──
  private readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug'))));
  // undefined = chargement, null = erreur API, tableau = prêt
  private readonly categories = toSignal(
    this.catalog.getCategories().pipe(catchError(() => of(null))),
  );
  readonly category = computed(() => this.categories()?.find((c) => c.slug === this.slug()));
  readonly categoryNotFound = computed(() => !!this.categories() && !this.category());

  // ── Labels proposés dans les filtres (GET /api/labels) ──
  readonly labels = toSignal(this.catalog.getLabels().pipe(catchError(() => of([] as Label[]))), {
    initialValue: [] as Label[],
  });

  // ── Filtres : un signal par filtre ──
  readonly location = signal('');
  readonly radius = signal(DEFAULT_RADIUS_KM);
  readonly seasonalOnly = signal(false);
  readonly pickup = signal(false);
  readonly delivery = signal(false);
  readonly selectedLabels = signal<string[]>([]);
  readonly verifiedOnly = signal(false);
  readonly minRating = signal<number | null>(null);
  readonly sort = signal<ProducerSort>('relevance');

  readonly radiusOptions = [10, 25, 50, 100];
  readonly ratingOptions = [1, 2, 3, 4, 5];
  readonly sortOptions: { value: ProducerSort; label: string }[] = [
    { value: 'relevance', label: 'Pertinence' },
    { value: 'distance', label: 'Distance' },
  ];

  /** Tous les filtres regroupés. null tant que la catégorie n'est pas connue. */
  private readonly query = computed<ProducerQuery | null>(() => {
    const category = this.category();
    if (!category) return null;
    return {
      categoryId: category.id,
      location: this.location().trim(),
      radius: this.radius(),
      seasonalOnly: this.seasonalOnly(),
      pickup: this.pickup(),
      delivery: this.delivery(),
      labels: this.selectedLabels(),
      verifiedOnly: this.verifiedOnly(),
      minRating: this.minRating(),
      sort: this.sort(),
    };
  });

  /**
   * À chaque changement de filtre : on attend 200 ms (debounce), puis on lance la recherche.
   * switchMap annule la recherche précédente si une nouvelle arrive : pas de résultats « périmés ».
   */
  private readonly state = toSignal(
    toObservable(this.query).pipe(
      filter((q): q is ProducerQuery => q !== null),
      debounceTime(200),
      switchMap((q) => this.runSearch(q)),
    ),
    { initialValue: { status: 'loading' } as SearchState },
  );

  readonly isLoading = computed(() => this.state().status === 'loading');
  readonly hasError = computed(() => this.state().status === 'error');
  readonly locationNotFound = computed(() => this.state().status === 'location-not-found');
  readonly producers = computed(() => {
    const s = this.state();
    return s.status === 'ready' ? s.items : [];
  });
  /** L'API ne renvoie pas de total : on compte les résultats reçus */
  readonly total = computed(() => this.producers().length);

  /**
   * 1) si une localisation est saisie, on la convertit en coordonnées GPS (le back n'accepte que lat/lng) ;
   * 2) on appelle GET /api/producers avec ces coordonnées.
   */
  private runSearch(q: ProducerQuery): Observable<SearchState> {
    // undefined = pas de localisation saisie ; null = saisie, mais lieu introuvable
    const coords$: Observable<Coordinates | null | undefined> = q.location
      ? this.geocoding.locate(q.location)
      : of(undefined);

    return coords$.pipe(
      switchMap((coords) =>
        coords === null
          ? of<SearchState>({ status: 'location-not-found' })
          : this.producerSearch
              .search(q, coords)
              .pipe(map((items): SearchState => ({ status: 'ready', items }))),
      ),
      startWith<SearchState>({ status: 'loading' }),
      catchError(() => of<SearchState>({ status: 'error' })),
    );
  }

  onLocationChange(value: string): void {
    this.location.set(value);
    // Le tri par distance n'a plus de sens sans localisation
    if (!value.trim() && this.sort() === 'distance') this.sort.set('relevance');
  }

  /** Ajoute ou retire un label de la sélection (le producteur doit les avoir tous) */
  toggleLabel(code: string): void {
    this.selectedLabels.update((codes) =>
      codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code],
    );
  }

  /** Recliquer sur la note active retire le filtre */
  toggleRating(stars: number): void {
    this.minRating.update((current) => (current === stars ? null : stars));
  }

  resetFilters(): void {
    this.location.set('');
    this.radius.set(DEFAULT_RADIUS_KM);
    this.seasonalOnly.set(false);
    this.pickup.set(false);
    this.delivery.set(false);
    this.selectedLabels.set([]);
    this.verifiedOnly.set(false);
    this.minRating.set(null);
    this.sort.set('relevance');
  }

  /** Style d'une pastille de filtre (active ou non), pour ne pas répéter les classes dans le template */
  chipClass(active: boolean): string {
    const base =
      'inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-agri';
    return active
      ? `${base} border-agri font-semibold text-agri`
      : `${base} border-grey-200 text-fonts hover:border-grey-400`;
  }

  /** Couleur du badge selon le code du label ; couleur neutre pour un label inconnu */
  labelClass(code: string): string {
    switch (code) {
      case 'bio':
        return 'bg-agri text-white';
      case 'local':
        return 'bg-earth text-white';
      default:
        return 'bg-badge-bg text-agri';
    }
  }

  /** L'API renvoie 2 décimales (14.23) : on arrondit pour l'affichage */
  roundKm(km: number): number {
    return Math.round(km);
  }
}
