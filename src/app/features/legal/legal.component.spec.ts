import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LegalComponent } from './legal.component';
import { LegalService } from './legal.service';
import { LegalPage } from './legal.model';

const page = (content: string): LegalPage => ({
  code: 'mentions-legales',
  locale: 'fr',
  title: 'Mentions légales',
  content,
  version: 1,
  publishedAt: null,
});

describe('LegalComponent', () => {
  let legalServiceMock: { getPage: ReturnType<typeof vi.fn> };

  async function create(page$: Observable<LegalPage>): Promise<HTMLElement> {
    legalServiceMock = { getPage: vi.fn(() => page$) };
    await TestBed.configureTestingModule({
      imports: [LegalComponent],
      providers: [
        { provide: LegalService, useValue: legalServiceMock },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ code: 'mentions-legales' })) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LegalComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('demande au back la page du code présent dans l\'adresse et affiche son titre', async () => {
    const compiled = await create(of(page('## Éditeur\n\nTexte.')));

    expect(legalServiceMock.getPage).toHaveBeenCalledWith('mentions-legales');
    expect(compiled.querySelector('h1')?.textContent).toContain('Mentions légales');
  });

  it('transforme les lignes "## Titre" en titres de section et le reste en paragraphes', async () => {
    const compiled = await create(of(page('## Éditeur du site\n\nPremier paragraphe.\n\n## Hébergement\n\nSecond paragraphe.')));

    expect([...compiled.querySelectorAll('h2')].map((h) => h.textContent?.trim())).toEqual([
      'Éditeur du site',
      'Hébergement',
    ]);
    expect([...compiled.querySelectorAll('p')].map((p) => p.textContent?.trim())).toEqual([
      'Premier paragraphe.',
      'Second paragraphe.',
    ]);
  });

  it('reste lisible si l\'admin oublie la ligne vide ou coupe un paragraphe sur plusieurs lignes', async () => {
    const compiled = await create(of(page('## Titre\nTexte sur\ndeux lignes.')));

    expect(compiled.querySelector('h2')?.textContent?.trim()).toBe('Titre');
    expect(compiled.querySelector('p')?.textContent?.trim()).toBe('Texte sur deux lignes.');
  });

  it('affiche "Page introuvable" quand le back ne connaît pas la page', async () => {
    const compiled = await create(throwError(() => new Error('404')));

    expect(compiled.querySelector('h1')?.textContent).toContain('Page introuvable');
  });
});
