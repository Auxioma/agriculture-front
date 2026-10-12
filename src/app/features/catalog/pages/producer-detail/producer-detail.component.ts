import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, filter, map, of, startWith, switchMap } from 'rxjs';
import { ProducerDetail } from '../../models/producer-detail.model';
import { CatalogService } from '../../services/catalog.service';
import { ProducerDetailService } from '../../services/producer-detail.service';
import {
  availabilityLabel,
  formatRadius,
  formatReviewDate,
  labelBadgeClass,
  summarizeOpeningHours,
} from '../../utils/producer-format';

/** Les états possibles de la page : un seul signal, impossible d'être « chargé ET en erreur » */
type ProducerState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ready'; producer: ProducerDetail };

/** Nombre d'avis affichés avant « Voir tous les avis » */
const REVIEWS_PREVIEW_COUNT = 2;

@Component({
  selector: 'app-producer-detail',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './producer-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProducerDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly api = inject(ProducerDetailService);
  private readonly catalog = inject(CatalogService);

  // ── Identifiant du producteur, lu dans l'URL (/producers/:id) ──
  private readonly id$ = this.route.paramMap.pipe(
    map((params) => params.get('id')),
    filter((id): id is string => id !== null),
  );

  // ── Fiche : switchMap annule la requête précédente si on passe d'un producteur à un autre ──
  private readonly state = toSignal(
    this.id$.pipe(
      switchMap((id) =>
        this.api.getProducer(id).pipe(
          map((producer): ProducerState => ({ status: 'ready', producer })),
          startWith<ProducerState>({ status: 'loading' }),
          catchError((error: unknown) =>
            of<ProducerState>({
              status:
                error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'error',
            }),
          ),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as ProducerState },
  );

  // ── Avis : requête indépendante, la fiche s'affiche même si les avis échouent ──
  // undefined = chargement, null = erreur
  readonly reviews = toSignal(
    this.id$.pipe(switchMap((id) => this.api.getReviews(id).pipe(catchError(() => of(null))))),
  );

  // ── Catégorie d'origine (?category=<slug>, ajouté par la liste des producteurs) pour le fil d'Ariane ──
  readonly category = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => params.get('category')),
      switchMap((slug) =>
        slug
          ? this.catalog.getCategories().pipe(
              map((categories) => categories.find((c) => c.slug === slug)),
              catchError(() => of(undefined)),
            )
          : of(undefined),
      ),
    ),
  );

  readonly isLoading = computed(() => this.state().status === 'loading');
  readonly notFound = computed(() => this.state().status === 'not-found');
  readonly hasError = computed(() => this.state().status === 'error');
  readonly producer = computed(() => {
    const s = this.state();
    return s.status === 'ready' ? s.producer : null;
  });

  readonly isVerified = computed(() => this.producer()?.verificationStatus === 'verified');

  /** La note vient de l'endpoint des avis (déjà disponible), à défaut de la fiche */
  readonly averageRating = computed(
    () => this.reviews()?.averageRating ?? this.producer()?.averageRating ?? null,
  );

  readonly story = computed(() => {
    const p = this.producer();
    return p?.story?.trim() || p?.description?.trim() || null;
  });

  readonly openingSummary = computed(() =>
    summarizeOpeningHours(this.producer()?.openingHours ?? []),
  );

  /** Plus grand rayon des zones de livraison, null s'il n'y en a pas */
  readonly saleRadiusKm = computed(() => {
    const radii = (this.producer()?.deliveryZones ?? [])
      .map((zone) => Number(zone.radiusKm))
      .filter((radius) => Number.isFinite(radius) && radius > 0);

    return radii.length > 0 ? Math.max(...radii) : null;
  });

  /** La section « Retrait, livraison & horaires » n'existe que si au moins une ligne a une valeur */
  readonly hasPracticalInfo = computed(() => {
    const p = this.producer();
    return (
      this.saleRadiusKm() !== null ||
      this.openingSummary() !== null ||
      p?.pickupAvailable !== undefined ||
      p?.deliveryAvailable !== undefined
    );
  });

  readonly showAllReviews = signal(false);
  readonly visibleReviews = computed(() => {
    const all = this.reviews()?.reviews ?? [];
    return this.showAllReviews() ? all : all.slice(0, REVIEWS_PREVIEW_COUNT);
  });
  readonly hasMoreReviews = computed(
    () => (this.reviews()?.reviews.length ?? 0) > REVIEWS_PREVIEW_COUNT,
  );

  // * Fonctions pures exposées au template
  readonly availabilityLabel = availabilityLabel;
  readonly formatRadius = formatRadius;
  readonly formatReviewDate = formatReviewDate;
  readonly labelBadgeClass = labelBadgeClass;

  constructor() {
    // * SEO : un titre et une description propres à chaque fiche (rendus aussi côté serveur)
    effect(() => {
      const producer = this.producer();
      if (!producer) return;

      this.title.setTitle(`${producer.farmName} – TrouveMoi Agri`);
      const summary = (producer.description ?? producer.story ?? '').trim();
      if (summary) {
        this.meta.updateTag({ name: 'description', content: summary.slice(0, 160) });
      }
    });
  }

  toggleReviews(): void {
    this.showAllReviews.update((value) => !value);
  }

  /** Défilement vers « Produits & disponibilités » (un lien #ancre rechargerait la page d'accueil, à cause de <base href>) */
  scrollToAvailability(): void {
    this.document
      .getElementById('disponibilites')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** 5 booléens : true = étoile pleine. Une note absente donne 5 étoiles vides. */
  stars(rating: number | null): boolean[] {
    return Array.from({ length: 5 }, (_, index) => index < Math.round(rating ?? 0));
  }

  /** Style d'un bouton d'action : or, vert plein ou contour vert, comme dans la maquette */
  ctaClass(kind: 'availability' | 'contact' | 'price'): string {
    const base =
      'inline-flex w-full items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-agri md:w-auto';
    switch (kind) {
      case 'availability':
        return `${base} bg-gold-wheat text-fonts hover:opacity-90`;
      case 'contact':
        return `${base} bg-agri text-white hover:opacity-90`;
      case 'price':
        return `${base} border border-agri bg-white text-agri hover:bg-badge-bg`;
    }
  }
}
