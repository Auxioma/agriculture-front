import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HomeComponent } from './home.component';
import { ProducerService } from './producer.service';
import { FeaturedProducer } from './producer.model';
import { FaqService } from './faq.service';
import { FaqArticle } from './faq.model';

const FEATURED_PRODUCERS: FeaturedProducer[] = [
  {
    id: 'producer-1',
    farmName: 'Ferme Dupont',
    slug: 'ferme-dupont',
    city: 'Bordeaux',
    countryCode: 'FR',
    distanceKm: 8,
    averageRating: 4.9,
    reviewCount: 12,
    photoUrl: '/images/categories/miel.jpg',
    labels: [{ code: 'bio', name: 'Bio' }, { code: 'local', name: 'Local' }],
  },
];

const FAQ_ARTICLES: FaqArticle[] = [
  { id: 'faq-1', category: null, question: 'Est-ce gratuit ?', answer: 'Oui, pour les clients.' },
  { id: 'faq-2', category: null, question: 'Y a-t-il une commission ?', answer: 'Non, jamais.' },
];

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let producerServiceMock: { getFeatured: ReturnType<typeof vi.fn> };
  let faqServiceMock: { getAll: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    producerServiceMock = { getFeatured: vi.fn(() => of(FEATURED_PRODUCERS)) };
    faqServiceMock = { getAll: vi.fn(() => of(FAQ_ARTICLES)) };

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: ProducerService, useValue: producerServiceMock },
        { provide: FaqService, useValue: faqServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  });

  it('devrait se créer', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('devrait afficher le titre et les 2 CTA du bandeau', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('agricole réuni');

    const links: NodeListOf<HTMLAnchorElement> = compiled.querySelectorAll('a');
    const texts = Array.from(links).map((a) => a.textContent?.trim());
    expect(texts.some((t) => t?.includes('Demander un prix en direct'))).toBe(true);
    expect(texts.some((t) => t?.includes('Je suis producteur'))).toBe(true);
  });

  it('devrait afficher les 3 badges de confiance', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Producteurs vérifiés');
    expect(text).toContain('Pas de commission produit');
    expect(text).toContain('Demandes gratuites pour les clients');
  });

  it('devrait afficher les 5 catégories populaires avec leur photo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Catégories populaires');

    const images: NodeListOf<HTMLImageElement> = compiled.querySelectorAll('[data-carousel="categories"] img');
    expect(images.length).toBe(5);
    expect(images[0].src).toContain('/images/categories/fruits.jpg');
  });

  it('cache les flèches du carrousel tant qu\'il ne déborde pas', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button[aria-label="Catégories précédentes"]')).toBeNull();
    expect(compiled.querySelector('button[aria-label="Catégories suivantes"]')).toBeNull();
  });

  it('affiche la flèche droite quand ça déborde, puis la gauche une fois scrollé', () => {
    const track: HTMLDivElement = fixture.nativeElement.querySelector('[data-carousel="categories"]');
    Object.defineProperty(track, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(track, 'clientWidth', { value: 300, configurable: true });
    Object.defineProperty(track, 'scrollLeft', { value: 0, configurable: true, writable: true });

    fixture.componentInstance.updateScrollState();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[aria-label="Catégories suivantes"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button[aria-label="Catégories précédentes"]')).toBeNull();

    track.scrollLeft = 700;
    fixture.componentInstance.updateScrollState();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[aria-label="Catégories précédentes"]')).toBeTruthy();
  });

  it('scrollCarousel fait défiler le carrousel dans le bon sens', () => {
    const track: HTMLDivElement = fixture.nativeElement.querySelector('[data-carousel="categories"]');
    Object.defineProperty(track, 'clientWidth', { value: 300, configurable: true });
    const scrollBySpy = vi.fn();
    track.scrollBy = scrollBySpy;

    fixture.componentInstance.scrollCarousel('right');
    expect(scrollBySpy).toHaveBeenCalledWith({ left: 240, behavior: 'smooth' });

    fixture.componentInstance.scrollCarousel('left');
    expect(scrollBySpy).toHaveBeenCalledWith({ left: -240, behavior: 'smooth' });
  });

  it('demande les producteurs à la une au service au chargement', () => {
    expect(producerServiceMock.getFeatured).toHaveBeenCalled();
  });

  it('affiche la fiche du producteur à la une avec sa note, sa ville et ses labels', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nos agriculteurs du mois');
    expect(text).toContain('Ferme Dupont');
    expect(text).toContain('Bordeaux');
    expect(text).toContain('8 km');
    expect(text).toContain('4.9');
    expect(text).toContain('Bio');
    expect(text).toContain('Local');
  });

  it('ne montre pas la section quand le service ne renvoie aucun producteur', async () => {
    producerServiceMock.getFeatured.mockReturnValue(of([]));

    const otherFixture = TestBed.createComponent(HomeComponent);
    otherFixture.detectChanges();

    const text = (otherFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Nos agriculteurs du mois');
  });

  it('affiche les producteurs à la une dans un carrousel horizontal défilable', () => {
    const track: HTMLDivElement = fixture.nativeElement.querySelector('[data-carousel="farmers"]');
    expect(track).toBeTruthy();

    Object.defineProperty(track, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(track, 'clientWidth', { value: 300, configurable: true });
    fixture.componentInstance.updateFarmersScrollState();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[aria-label="Producteurs suivants"]')).toBeTruthy();

    const scrollBySpy = vi.fn();
    track.scrollBy = scrollBySpy;
    fixture.componentInstance.scrollFarmersCarousel('right');
    expect(scrollBySpy).toHaveBeenCalledWith({ left: 240, behavior: 'smooth' });
  });

  it('affiche les 3 étapes de "Comment ça marche"', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Comment ça marche ?');
    expect(text).toContain('Etape 1 — Demandez');
    expect(text).toContain('Etape 2 — Recevez des réponse');
    expect(text).toContain('Etape 3 — Achetez en direct');
  });

  it('affiche les 4 raisons d\'acheter en direct', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Pourquoi acheter en direct');
    expect(text).toContain('Fraîcheur');
    expect(text).toContain('Origine');
    expect(text).toContain('Saisonnalité');
    expect(text).toContain('Dialogue');
  });

  it('affiche le bloc producteur avec le CTA vers l\'inscription producteur', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Vous êtes agriculteurs');
    expect(compiled.textContent).toContain('0%');
    expect(compiled.textContent).toContain('9€');

    const cta = [...compiled.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Je crée mon profil producteur'),
    );
    expect(cta?.getAttribute('href')).toBe('/auth/register?role=producer');
  });

  it('affiche le bloc "Boostez votre visibilité" avec le CTA vers les forfaits', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Boostez votre visibilité');
    expect(compiled.textContent).toContain('1 200+');
    expect(compiled.textContent).toContain('x3');

    const cta = [...compiled.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Découvrir les forfaits producteurs'),
    );
    expect(cta?.getAttribute('href')).toBe('/pricing');
  });

  it('demande la FAQ au service et affiche les questions, réponses repliées par défaut', () => {
    expect(faqServiceMock.getAll).toHaveBeenCalled();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Questions fréquemment posées');
    expect(compiled.textContent).toContain('Est-ce gratuit ?');
    expect(compiled.textContent).toContain('Y a-t-il une commission ?');
    expect(compiled.textContent).not.toContain('Oui, pour les clients.');
  });

  it('déplie une question au clic, et la replie si on reclique', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const question = [...compiled.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Est-ce gratuit ?'),
    )!;

    question.click();
    fixture.detectChanges();
    expect(compiled.textContent).toContain('Oui, pour les clients.');

    question.click();
    fixture.detectChanges();
    expect(compiled.textContent).not.toContain('Oui, pour les clients.');
  });

  it('ne montre pas la section FAQ quand le service ne renvoie aucun article', () => {
    faqServiceMock.getAll.mockReturnValue(of([]));

    const otherFixture = TestBed.createComponent(HomeComponent);
    otherFixture.detectChanges();

    const text = (otherFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Questions fréquemment posées');
  });
});
