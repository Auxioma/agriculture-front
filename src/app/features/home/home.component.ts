import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProducerService } from './producer.service';
import { FeaturedProducer } from './producer.model';

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

  // semblable au figma ("Pourquoi acheter en direct ?")
  readonly whyDirectItems = [
    {
      icon: 'sprout',
      title: 'Fraîcheur',
      text: 'Des produits récoltés au bon moment, sans intermédiaire ni long transport.',
    },
    {
      icon: 'map-pin',
      title: 'Origine',
      text: 'Vous savez exactement quelle exploitation produit ce que vous achetez.',
    },
    {
      icon: 'calendar',
      title: 'Saisonnalité',
      text: 'Des produits proposés selon les récoltes réelles, pas un catalogue permanent.',
    },
    {
      icon: 'message-square',
      title: 'Dialogue',
      text: 'Posez vos questions directement au producteur avant de vous engager.',
    },
  ];

  // memes categories que la navbar (CatalogFixtures.php), avec une photo par categorie pour le carroussel
  readonly categories = [
    { label: 'Fruits', image: '/images/categories/fruits.jpg' },
    { label: 'Légumes', image: '/images/categories/legumes.jpg' },
    { label: 'Produits laitiers', image: '/images/categories/produits-laitiers.jpg' },
    { label: 'Viandes & Volailles', image: '/images/categories/viandes-volailles.jpg' },
    { label: 'Miel & Produits de la ruche', image: '/images/categories/miel.jpg' },
  ];

  private carouselTrack = viewChild<ElementRef<HTMLDivElement>>('carouselTrack');
  canScrollLeft = signal(false);
  canScrollRight = signal(false);

  // meme principe de carroussel que les categories, pour les producteurs a la une en mobile
  private farmersTrack = viewChild<ElementRef<HTMLDivElement>>('farmersTrack');
  canScrollFarmersLeft = signal(false);
  canScrollFarmersRight = signal(false);

  // producteurs les mieux notes + verifies, calcule cote back (GET /api/producers/featured)
  private producerService = inject(ProducerService);
  featuredProducers = signal<FeaturedProducer[]>([]);

  constructor() {
    const destroyRef = inject(DestroyRef);

    // les fleches n'apparaissent que si les cards depassent vraiment de l'ecran
    afterNextRender(() => {
      this.updateScrollState();
      this.updateFarmersScrollState();
      const onResize = () => {
        this.updateScrollState();
        this.updateFarmersScrollState();
      };
      window.addEventListener('resize', onResize);
      destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
    });

    // les cards des producteurs arrivent apres coup (requete async) : il faut recalculer les fleches
    // une fois le DOM mis a jour, d'ou le setTimeout(0) le temps que la vue se redessine.
    this.producerService.getFeatured().subscribe((producers) => {
      this.featuredProducers.set(producers);
      setTimeout(() => this.updateFarmersScrollState());
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

  updateFarmersScrollState(): void {
    const el = this.farmersTrack()?.nativeElement;
    if (!el) return;
    this.canScrollFarmersLeft.set(el.scrollLeft > 4);
    this.canScrollFarmersRight.set(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }

  scrollFarmersCarousel(direction: 'left' | 'right'): void {
    const el = this.farmersTrack()?.nativeElement;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  labelColorClass(code: string): string {
    return LABEL_COLORS[code] ?? 'bg-grey-500';
  }
}
