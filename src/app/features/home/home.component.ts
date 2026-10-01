import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
})
export class HomeComponent {
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

  constructor() {
    const destroyRef = inject(DestroyRef);

    // les fleches n'apparaissent que si les cards depassent vraiment de l'ecran
    afterNextRender(() => {
      this.updateScrollState();
      const onResize = () => this.updateScrollState();
      window.addEventListener('resize', onResize);
      destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
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
}
