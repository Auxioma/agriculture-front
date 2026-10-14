import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { ProducerService } from './producer.service';
import { FeaturedProducer } from './producer.model';
import { CatalogService } from '../catalog/services/catalog.service';
import { Category } from '../catalog/models/category.model';

// une couleur par label (mêmes teintes que les badges de confiance du bandeau)
const LABEL_COLORS: Record<string, string> = {
  bio: 'bg-agri',
  hve: 'bg-earth',
  'agriculture-raisonnee': 'bg-secondary',
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  // semblable au figma ("Comment ça marche ?")
  readonly howItWorksSteps = [
    {
      eyebrow: 'Etape 1 — Demandez',
      title: 'Exprimez votre besoin',
      text: 'Recherchez un produit, précisez votre localisation, la date souhaitée et vos préférences. Votre demande est envoyée gratuitement aux producteurs disponibles autour de vous.',
    },
    {
      eyebrow: 'Etape 2 — Recevez des réponse',
      title: 'Exprimez votre besoin',
      text: 'Recherchez un produit, précisez votre localisation, la date souhaitée et vos préférences. Votre demande est envoyée gratuitement aux producteurs disponibles autour de vous.',
    },
    {
      eyebrow: 'Etape 3 — Achetez en direct',
      title: 'Organiez votre achat',
      text: "Une fois d'accord sur les conditions, vous convenez du prix, du retrait ou de la livraison directement avec le producteur — sans intermédiaire, sans commission.",
    },
  ];

  private catalog = inject(CatalogService);
  private producerService = inject(ProducerService);
  private injector = inject(Injector);

  // image neutre quand une catégorie n'a pas d'imageUrl
  readonly fallbackImage = '/images/categories/default.jpg';

  // 5 catégories les plus populaires (GET /api/categories?sort=popular&limit=5)
  popularCategories = signal<Category[]>([]);

  private carouselTrack = viewChild<ElementRef<HTMLDivElement>>('carouselTrack');
  canScrollLeft = signal(false);
  canScrollRight = signal(false);

  // producteurs les mieux notes + verifies, calcule cote back (GET /api/producers/featured)
  featuredProducers = signal<FeaturedProducer[]>([]);

  constructor() {
    const destroyRef = inject(DestroyRef);

    // les fleches n'apparaissent que si les cards depassent vraiment de l'ecran
    afterNextRender(() => {
      this.updateScrollState();
      const onResize = () => this.updateScrollState();
      window.addEventListener('resize', onResize);
      destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
    });

    this.producerService
      .getFeatured()
      .subscribe((producers) => this.featuredProducers.set(producers));

    this.catalog
      .getPopularCategories()
      .pipe(
        catchError(() => of([] as Category[])),
        takeUntilDestroyed(),
      )
      .subscribe((categories) => {
        this.popularCategories.set(categories);
        // les cartes viennent d'apparaître : on recalcule l'état des flèches après le rendu
        afterNextRender(() => this.updateScrollState(), { injector: this.injector });
      });
  }

  updateScrollState(): void {
    const el = this.carouselTrack()?.nativeElement;
    if (!el) return;
    this.canScrollLeft.set(el.scrollLeft > 4);
    this.canScrollRight.set(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }

  scrollCarousel(direction: 'left' | 'right'): void {
    const el = this.carouselTrack()?.nativeElement;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  labelColorClass(code: string): string {
    return LABEL_COLORS[code] ?? 'bg-grey-500';
  }
}
