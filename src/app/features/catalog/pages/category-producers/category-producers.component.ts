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

  private readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug'))));
  private readonly categories = toSignal(
    this.catalog.getCategories().pipe(catchError(() => of(null))),
  );
  readonly category = computed(() => this.categories()?.find((c) => c.slug === this.slug()));
  readonly categoryNotFound = computed(() => !!this.categories() && !this.category());

  readonly labels = toSignal(this.catalog.getLabels().pipe(catchError(() => of([] as Label[]))), {
    initialValue: [] as Label[],
  });

  readonly location = signal('');
  readonly radius = signal(DEFAULT_RADIUS_KM);
  readonly pickup = signal(false);
  readonly delivery = signal(false);
  readonly selectedLabel = signal<string | null>(null);
  readonly verifiedOnly = signal(false);
  readonly sort = signal<ProducerSort>('relevance');

  readonly radiusOptions = [10, 25, 50, 100];
  readonly ratingOptions = [1, 2, 3, 4, 5];
  readonly sortOptions: { value: ProducerSort; label: string }[] = [
    { value: 'relevance', label: 'Pertinence' },
    { value: 'distance', label: 'Distance' },
  ];

  private readonly query = computed<ProducerQuery | null>(() => {
    const category = this.category();
    if (!category) return null;
    return {
      categoryId: category.id,
      location: this.location().trim(),
      radius: this.radius(),
      pickup: this.pickup(),
      delivery: this.delivery(),
      label: this.selectedLabel(),
      verifiedOnly: this.verifiedOnly(),
      sort: this.sort(),
    };
  });

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
  readonly total = computed(() => this.producers().length);

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
    if (!value.trim() && this.sort() === 'distance') this.sort.set('relevance');
  }

  toggleLabel(code: string): void {
    this.selectedLabel.update((current) => (current === code ? null : code));
  }

  resetFilters(): void {
    this.location.set('');
    this.radius.set(DEFAULT_RADIUS_KM);
    this.pickup.set(false);
    this.delivery.set(false);
    this.selectedLabel.set(null);
    this.verifiedOnly.set(false);
    this.sort.set('relevance');
  }

  chipClass(active: boolean): string {
    const base =
      'inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-agri';
    return active
      ? `${base} border-agri font-semibold text-agri`
      : `${base} border-grey-200 text-fonts hover:border-grey-400`;
  }

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

  roundKm(km: number): number {
    return Math.round(km);
  }
}
