import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewsComponent } from './reviews.component';
import { Review, ReviewsService, ReviewsSummary } from './reviews.service';

const YEAR = new Date().getFullYear();

const review = (overrides: Partial<Review>): Review => ({
  id: Math.random().toString(),
  authorName: 'Client',
  rating: 5,
  comment: null,
  producerResponse: null,
  createdAt: `${YEAR}-08-10T12:00:00`,
  ...overrides,
});

const SUMMARY: ReviewsSummary = {
  averageRating: 4.8,
  count: 24,
  reviews: [
    review({ id: 'r1', authorName: 'Camille R.', rating: 5, comment: 'Tomates excellentes, échange très simple et rapide.' }),
    review({ id: 'r2', authorName: 'Lucas M.', rating: 4, comment: 'Bon produit, un peu de retard sur le créneau de retrait.', producerResponse: 'Merci, nous ferons mieux.', createdAt: `${YEAR}-08-03T12:00:00` }),
    review({ id: 'r3', authorName: null, rating: 3, comment: null, createdAt: `${YEAR - 1}-03-05T12:00:00` }),
  ],
};

describe('ReviewsComponent', () => {
  let fixture: ComponentFixture<ReviewsComponent>;
  let compiled: HTMLElement;
  let service: { list: ReturnType<typeof vi.fn>; respond: ReturnType<typeof vi.fn> };

  async function create(data$: Observable<ReviewsSummary> = of(SUMMARY)): Promise<void> {
    service = { list: vi.fn(() => data$), respond: vi.fn(() => of({ id: 'r1' })) };
    await TestBed.configureTestingModule({
      imports: [ReviewsComponent],
      providers: [provideRouter([]), { provide: ReviewsService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewsComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = () => compiled.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const cards = () => [...compiled.querySelectorAll('ul > li')];
  const card = (author: string) => cards().find((li) => li.querySelector('h2')?.textContent?.trim() === author)!;
  const button = (scope: Element | HTMLElement, label: string) => [...scope.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  const type = (scope: Element, value: string) => {
    const box = scope.querySelector('textarea')!;
    box.value = value;
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const submit = async (scope: Element) => {
    scope.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('affiche la moyenne, ses étoiles et le nombre d’avis', async () => {
    await create();

    expect(text()).toContain('4,8');
    expect(text()).toContain('Basé sur 24 avis');
    expect(compiled.querySelector('[aria-label="4,8 sur 5"]')).toBeTruthy();
    // 4,8 s'arrondit a 5 etoiles jaunes
    expect(compiled.querySelectorAll('.bg-badge-bg svg.text-warning').length).toBe(5);
  });

  it('une carte par avis, du premier au dernier : auteur, note, commentaire et date', async () => {
    await create();

    expect(cards().length).toBe(3);
    const camille = card('Camille R.');
    expect(camille.textContent).toContain('Tomates excellentes, échange très simple et rapide.');
    expect(camille.textContent).toContain('10 août');
    expect(camille.querySelector('[aria-label="5 sur 5"]')).toBeTruthy();
    expect(card('Lucas M.').querySelector('[aria-label="4 sur 5"]')).toBeTruthy();
  });

  it('colore les étoiles de la note et laisse les autres grises', async () => {
    await create();

    const stars = [...card('Lucas M.').querySelectorAll('svg')].map((s) => s.classList.contains('text-warning'));
    expect(stars).toEqual([true, true, true, true, false]);
  });

  it('un auteur inconnu s’appelle « Client », un avis sans commentaire montre seulement sa note, un avis ancien son année', async () => {
    await create();

    const anonymous = card('Client');
    expect(anonymous.textContent).toContain('5 mars ' + (YEAR - 1));
    expect(anonymous.querySelector('p')).toBeNull();
  });

  describe('répondre', () => {
    it('propose « Répondre » seulement aux avis sans réponse, et montre la réponse déjà donnée', async () => {
      await create();

      expect(button(card('Camille R.'), 'Répondre')).toBeTruthy();
      expect(button(card('Lucas M.'), 'Répondre')).toBeUndefined();
      expect(card('Lucas M.').textContent).toContain('Votre réponse');
      expect(card('Lucas M.').textContent).toContain('Merci, nous ferons mieux.');
    });

    it('ouvre un champ dans la carte, prévient que la réponse est publique et ne laisse envoyer qu’un texte non vide', async () => {
      await create();
      const camille = card('Camille R.');

      button(camille, 'Répondre')!.click();
      fixture.detectChanges();

      expect(camille.querySelector('textarea')).toBeTruthy();
      expect(camille.textContent).toContain('visible par tous');
      expect(button(camille, 'Répondre')).toBeUndefined();
      expect((button(camille, 'Publier la réponse') as HTMLButtonElement).disabled).toBe(true);
      type(camille, '   ');
      expect((button(camille, 'Publier la réponse') as HTMLButtonElement).disabled).toBe(true);
      await submit(camille);
      expect(service.respond).not.toHaveBeenCalled();
      type(camille, 'Merci Camille !');
      expect((button(camille, 'Publier la réponse') as HTMLButtonElement).disabled).toBe(false);
    });

    it('envoie la réponse, l’affiche aussitôt à la place du bouton et referme le champ', async () => {
      await create();
      const camille = card('Camille R.');
      button(camille, 'Répondre')!.click();
      fixture.detectChanges();
      type(camille, '  Merci Camille !  ');

      await submit(camille);

      expect(service.respond).toHaveBeenCalledWith('r1', 'Merci Camille !');
      expect(camille.querySelector('textarea')).toBeNull();
      expect(camille.textContent).toContain('Votre réponse');
      expect(camille.textContent).toContain('Merci Camille !');
      expect(button(camille, 'Répondre')).toBeUndefined();
    });

    it('affiche le refus du back et garde le texte quand l’envoi échoue', async () => {
      await create();
      service.respond.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { error: "Cet avis n'est pas encore publié." } })));
      const camille = card('Camille R.');
      button(camille, 'Répondre')!.click();
      fixture.detectChanges();
      type(camille, 'Merci !');

      await submit(camille);

      expect(camille.querySelector('[role="alert"]')?.textContent).toContain("Cet avis n'est pas encore publié.");
      expect(camille.querySelector('textarea')!.value).toBe('Merci !');
      // pas de bloc « Votre réponse » : rien n'a été publié
      expect(camille.querySelector('.bg-badge-bg')).toBeNull();
    });

    it('« Annuler » referme le champ sans rien envoyer, et on peut rouvrir un champ vide', async () => {
      await create();
      const camille = card('Camille R.');
      button(camille, 'Répondre')!.click();
      fixture.detectChanges();
      type(camille, 'Brouillon');

      button(camille, 'Annuler')!.click();
      fixture.detectChanges();
      expect(camille.querySelector('textarea')).toBeNull();
      expect(service.respond).not.toHaveBeenCalled();

      button(camille, 'Répondre')!.click();
      fixture.detectChanges();
      expect(camille.querySelector('textarea')!.value).toBe('');
    });

    it('ouvrir la réponse d’un autre avis referme la première', async () => {
      await create();
      button(card('Camille R.'), 'Répondre')!.click();
      fixture.detectChanges();

      button(card('Client'), 'Répondre')!.click();
      fixture.detectChanges();

      expect(card('Camille R.').querySelector('textarea')).toBeNull();
      expect(card('Client').querySelector('textarea')).toBeTruthy();
    });
  });

  it('sans avis, explique comment il en arrive, sans moyenne', async () => {
    await create(of({ averageRating: null, count: 0, reviews: [] }));

    expect(text()).toContain('Aucun avis pour le moment.');
    expect(text()).toContain('validé par l\'équipe');
    expect(compiled.querySelector('[role="img"]')).toBeNull();
  });

  it('prévient quand les avis ne se chargent pas', async () => {
    await create(throwError(() => new HttpErrorResponse({ status: 500 })));

    expect(text()).toContain('Impossible de charger les avis pour le moment.');
    expect(cards()).toEqual([]);
  });

  it('ramène au profil', async () => {
    await create();

    expect(compiled.querySelector('a[href="/producer/profile"]')?.textContent?.trim()).toBe('Retour au profil');
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Avis clients');
  });
});
