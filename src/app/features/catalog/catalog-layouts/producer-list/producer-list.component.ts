import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, catchError, debounceTime, filter, map, of, startWith, switchMap } from 'rxjs';
import {
  Coordinates,
  Label,
  PRODUCERS_PAGE_SIZE,
  ProducerFilters,
  ProducerPage,
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
  | { status: 'ready'; items: ProducerSummary[]; total: number };

const DEFAULT_RADIUS_KM = 25;

/**
 * Filtres + tri + liste de producteurs, partagés par la page Producteurs (/producers) et la page d'une
 * catégorie (/categories/:slug). Les pages ne gardent que ce qui leur est propre : fil d'Ariane, titre,
 * catégorie introuvable.
 */
@Component({
  selector: 'app-producer-list',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './producer-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProducerListComponent {
  /**
   * Catégorie dont on liste les producteurs :
   *  - un id : filtre sur cette catégorie ;
   *  - null : pas de filtre, tous les producteurs actifs (page Producteurs) ;
   *  - undefined : catégorie pas encore connue, on attend avant de lancer la recherche.
   */
  readonly categoryId = input<string | null | undefined>(null);
  /** Slug de la catégorie, transmis aux fiches (?category=) pour leur fil d'Ariane */
  readonly categorySlug = input<string | null>(null);
  /** Nom de la catégorie, pour le message « aucun résultat » */
  readonly categoryName = input<string | null>(null);

  private readonly catalog = inject(CatalogService);
  private readonly geocoding = inject(GeocodingService);
  private readonly producerSearch = inject(ProducerSearchService);
  private readonly document = inject(DOCUMENT);

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
    { value: 'popularity', label: 'Popularité' },
    { value: 'newest', label: 'Nouveauté' },
  ];

  /** Tous les filtres regroupés (sans la page). null tant que la catégorie n'est pas connue (categoryId undefined). */
  private readonly filters = computed<ProducerFilters | null>(() => {
    const categoryId = this.categoryId();
    if (categoryId === undefined) return null;
    return {
      categoryId,
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
   * Page affichée. linkedSignal : elle revient automatiquement à 1 dès qu'un filtre ou le tri change
   * (sinon, en page 3, cocher « Bio » afficherait la page 3 des producteurs bio, probablement vide).
   */
  readonly page = linkedSignal<ProducerFilters | null, number>({
    source: this.filters,
    computation: () => 1,
  });

  /** Filtres + page : ce qui est envoyé au back. null tant que les filtres ne sont pas prêts. */
  private readonly query = computed<ProducerQuery | null>(() => {
    const filters = this.filters();
    return filters ? { ...filters, page: this.page() } : null;
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
  /** Nombre de producteurs de TOUTES les pages (en-tête X-Total-Count), pas seulement de la page affichée */
  readonly total = computed(() => {
    const s = this.state();
    return s.status === 'ready' ? s.total : 0;
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PRODUCERS_PAGE_SIZE)));

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
              .pipe(map((result: ProducerPage): SearchState => ({ status: 'ready', ...result }))),
      ),
      startWith<SearchState>({ status: 'loading' }),
      catchError(() => of<SearchState>({ status: 'error' })),
    );
  }

  constructor() {
    // * Si le total diminue entre deux requêtes, la page demandée peut dépasser la dernière : le back répond alors
    // * 200 avec une liste vide. On revient à la dernière page existante plutôt que d'afficher « Aucun producteur ».
    effect(() => {
      const s = this.state();
      if (
        s.status === 'ready' &&
        s.items.length === 0 &&
        s.total > 0 &&
        this.page() > this.totalPages()
      ) {
        this.page.set(this.totalPages());
      }
    });
  }

  /** Change de page (bornée entre 1 et la dernière) puis remonte en haut des résultats */
  goToPage(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
    // * Optionnel (?.) : absent hors navigateur (rendu serveur) et dans certains environnements de test.
    this.document
      .getElementById('producer-results')
      ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
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
