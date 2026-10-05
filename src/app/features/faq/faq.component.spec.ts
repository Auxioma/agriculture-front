import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FaqComponent } from './faq.component';
import { FaqService } from '../home/faq.service';
import { FaqArticle } from '../home/faq.model';

const ARTICLES: FaqArticle[] = [
  { id: 'c1', category: 'Clients', question: 'Est-ce gratuit ?', answer: 'Oui, pour les clients.' },
  { id: 'c2', category: 'Clients', question: 'Et le paiement ?', answer: 'Hors plateforme.' },
  { id: 'p1', category: 'Producteurs', question: 'Combien ça coûte ?', answer: 'À partir de 9€.' },
  { id: 'x1', category: null, question: 'Sans catégorie ?', answer: 'Dans "Autre".' },
];

describe('FaqComponent', () => {
  let faqServiceMock: { getAll: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<FaqComponent>;

  async function create(articles$: Observable<FaqArticle[]> = of(ARTICLES)): Promise<HTMLElement> {
    faqServiceMock = { getAll: vi.fn(() => articles$) };
    await TestBed.configureTestingModule({
      imports: [FaqComponent],
      providers: [{ provide: FaqService, useValue: faqServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(FaqComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const click = (compiled: HTMLElement, question: string) => {
    [...compiled.querySelectorAll('button')].find((b) => b.textContent?.includes(question))!.click();
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('range les questions du back en colonnes par catégorie', async () => {
    const compiled = await create();

    expect(faqServiceMock.getAll).toHaveBeenCalled();
    const labels = [...compiled.querySelectorAll('h2')].map((h) => h.textContent?.trim());
    expect(labels).toEqual(['Clients', 'Producteurs', 'Autre']);
    expect(compiled.querySelectorAll('button').length).toBe(4);
  });

  it('ouvre la première question de chaque colonne au départ, pas les autres', async () => {
    const text = (await create()).textContent ?? '';

    expect(text).toContain('Oui, pour les clients.');
    expect(text).toContain('À partir de 9€.');
    expect(text).not.toContain('Hors plateforme.');
  });

  it('un seul accordéon ouvert par colonne, et un clic sur l\'ouvert le referme', async () => {
    const compiled = await create();

    click(compiled, 'Et le paiement ?');
    expect(compiled.textContent).toContain('Hors plateforme.');
    expect(compiled.textContent).not.toContain('Oui, pour les clients.');
    expect(compiled.textContent).toContain('À partir de 9€.');

    click(compiled, 'Et le paiement ?');
    expect(compiled.textContent).not.toContain('Hors plateforme.');
  });

  it('affiche un message quand le back ne renvoie aucune question', async () => {
    const compiled = await create(of([]));
    expect(compiled.textContent).toContain('Aucune question pour le moment.');
  });

  it('affiche aussi le message si le back est injoignable', async () => {
    const compiled = await create(throwError(() => new Error('API down')));
    expect(compiled.textContent).toContain('Aucune question pour le moment.');
  });
});
