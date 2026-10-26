import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { LabelsComponent } from './labels.component';
import { ClaimedLabel, LabelInfo, LabelsPage, LabelsService } from './labels.service';

const CATALOG: LabelInfo[] = [
  { id: 'l-bio', code: 'bio', name: 'Bio', description: 'Certification agriculture biologique (AB / EU Organic).' },
  { id: 'l-hve', code: 'hve', name: 'HVE', description: 'Haute Valeur Environnementale.' },
  { id: 'l-aop', code: 'aop-aoc', name: 'AOP / AOC', description: "Appellation d'origine protégée ou contrôlée." },
  { id: 'l-rais', code: 'agriculture-raisonnee', name: 'Agriculture raisonnée', description: 'Pratiques limitant les intrants.' },
  { id: 'l-local', code: 'local', name: 'Local', description: null },
];

const claimed = (labelId: string, changes: Partial<ClaimedLabel> = {}): ClaimedLabel => ({
  labelId,
  code: labelId,
  name: labelId,
  verifiedAt: null,
  expiresAt: null,
  documentId: null,
  documentStatus: null,
  ...changes,
});

const PAGE: LabelsPage = {
  profile: { verificationStatus: 'verified', verifiedAt: '2026-02-05T10:00:00+01:00' },
  catalog: CATALOG,
  claimed: [
    claimed('l-bio', { verifiedAt: '2026-03-12T10:00:00+01:00', expiresAt: '2099-03-12T10:00:00+01:00' }),
    claimed('l-hve', { verifiedAt: '2026-03-12T10:00:00+01:00', expiresAt: '2099-03-12T10:00:00+01:00' }),
    claimed('l-aop', { documentId: 'd1', documentStatus: 'pending' }),
    claimed('l-local', { verifiedAt: '2026-02-05T10:00:00+01:00', expiresAt: '2099-02-05T10:00:00+01:00' }),
  ],
};

describe('LabelsComponent', () => {
  let fixture: ComponentFixture<LabelsComponent>;
  let compiled: HTMLElement;
  let service: { getPage: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };

  async function create(page$: Observable<LabelsPage> = of(PAGE)): Promise<void> {
    service = { getPage: vi.fn(() => page$), save: vi.fn(() => of([])) };
    await TestBed.configureTestingModule({
      imports: [LabelsComponent],
      providers: [provideRouter([]), { provide: LabelsService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(LabelsComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const row = (name: string) => [...compiled.querySelectorAll('ul > li')].find((li) => li.querySelector('h2')?.textContent?.trim() === name)!;
  const toggle = (name: string) => row(name).querySelector<HTMLButtonElement>('button[role=switch]')!;
  const click = (el: HTMLElement) => {
    el.click();
    fixture.detectChanges();
  };
  const link = (name: string) => [...row(name).querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Ajouter un justificatif');
  const badge = (name: string) => text(row(name).querySelector('span.px-3'));
  const pick = (name: string, file: File) => {
    const input = row(name).querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const pdf = (name = 'certificat.pdf') => new File(['pdf'], name, { type: 'application/pdf' });

  it('explique la page et montre le profil vérifié avec sa date', async () => {
    await create();

    expect(text(compiled.querySelector('h1'))).toBe('Labels et certifications');
    expect(compiled.textContent).toContain("Chaque déclaration peut être vérifiée sur présentation d'un justificatif.");
    expect(text(compiled.querySelector('.bg-badge-bg.rounded-xl'))).toBe('Profil vérifiéVérifié le 5 février 2026 par notre équipe');
  });

  it('dit « vérifié par notre équipe » quand aucune validation n a été tracée', async () => {
    await create(of({ ...PAGE, profile: { verificationStatus: 'verified', verifiedAt: null } }));

    expect(text(compiled.querySelector('.bg-badge-bg.rounded-xl'))).toBe('Profil vérifiéVérifié par notre équipe');
  });

  it('montre un profil en cours de vérification, et rien pour un profil refusé', async () => {
    await create(of({ ...PAGE, profile: { verificationStatus: 'pending', verifiedAt: null } }));
    expect(compiled.textContent).toContain('Profil en cours de vérification');
    expect(compiled.textContent).not.toContain('Profil vérifié');

    TestBed.resetTestingModule();
    await create(of({ ...PAGE, profile: { verificationStatus: 'rejected', verifiedAt: null } }));
    expect(compiled.textContent).not.toContain('Profil vérifié');
    expect(compiled.textContent).not.toContain('en cours de vérification');
  });

  it('montre chaque label avec sa description, son interrupteur et l état de sa vérification', async () => {
    await create();

    expect(text(row('Bio'))).toContain('Certification agriculture biologique (AB / EU Organic).');
    expect([badge('Bio'), text(row('Bio').querySelector('p.text-xs'))]).toEqual(['Vérifié', 'Vérifié le 12 mars 2026']);
    expect([badge('AOP / AOC'), text(row('AOP / AOC').querySelector('p.text-xs'))]).toEqual(['En attente', "Justificatif reçu, en cours d'examen"]);
    expect(badge('Agriculture raisonnée')).toBe('Non déclaré');
    expect(text(row('Local').querySelector('p.text-xs'))).toBe('Vérifié le 5 février 2026');
    expect(['Bio', 'HVE', 'AOP / AOC', 'Agriculture raisonnée', 'Local'].map((n) => toggle(n).getAttribute('aria-checked'))).toEqual(['true', 'true', 'true', 'false', 'true']);
  });

  it('propose d ajouter un justificatif sauf pour un label vérifié ou en cours d examen', async () => {
    await create();

    expect(link('Agriculture raisonnée')).toBeDefined();
    expect(link('Bio')).toBeUndefined();
    expect(link('AOP / AOC')).toBeUndefined();
  });

  it('déclare un label qu on active, avec la mention qu il reste à enregistrer', async () => {
    await create();

    click(toggle('Agriculture raisonnée'));

    expect(toggle('Agriculture raisonnée').getAttribute('aria-checked')).toBe('true');
    expect(badge('Agriculture raisonnée')).toBe('À enregistrer');
    expect(text(row('Agriculture raisonnée'))).toContain('Sans justificatif, ce label ne sera pas vérifié');
  });

  it('prévient qu un label vérifié qu on retire devra être vérifié de nouveau', async () => {
    await create();

    click(toggle('Bio'));

    expect(toggle('Bio').getAttribute('aria-checked')).toBe('false');
    expect(text(row('Bio'))).toContain("Sera retiré à l’enregistrement : il devra être vérifié de nouveau");
  });

  it('« Ajouter un justificatif » déclare le label et garde le fichier choisi jusqu à l enregistrement', async () => {
    await create();

    pick('Agriculture raisonnée', pdf('attestation.pdf'));

    expect(toggle('Agriculture raisonnée').getAttribute('aria-checked')).toBe('true');
    expect(text(row('Agriculture raisonnée'))).toContain('Justificatif choisi : attestation.pdf');
    expect(link('Agriculture raisonnée')).toBeUndefined();

    const remove = [...row('Agriculture raisonnée').querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Retirer')!;
    click(remove);
    expect(text(row('Agriculture raisonnée'))).not.toContain('Justificatif choisi');
    expect(link('Agriculture raisonnée')).toBeDefined();
    // * retirer le fichier ne retire pas la déclaration
    expect(toggle('Agriculture raisonnée').getAttribute('aria-checked')).toBe('true');
  });

  it('refuse un justificatif qui n est ni une image ni un pdf', async () => {
    await create();

    pick('Agriculture raisonnée', new File(['x'], 'notes.txt', { type: 'text/plain' }));

    expect(compiled.querySelector('[role=alert]')?.textContent).toContain('jpeg, png, webp ou pdf, 10 Mo maximum');
    expect(toggle('Agriculture raisonnée').getAttribute('aria-checked')).toBe('false');
  });

  it('décocher un label efface le justificatif choisi pour lui', async () => {
    await create();
    pick('Agriculture raisonnée', pdf());

    click(toggle('Agriculture raisonnée'));

    expect(text(row('Agriculture raisonnée'))).not.toContain('Justificatif choisi');
  });

  it('enregistre tous les choix, puis recharge ce que le serveur sait et le dit', async () => {
    await create();
    click(toggle('Bio'));
    const file = pdf();
    pick('Agriculture raisonnée', file);

    click([...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Enregistrer mes déclarations')!);

    expect(service.save).toHaveBeenCalledWith([
      { label: CATALOG[0], on: false, file: null },
      { label: CATALOG[1], on: true, file: null },
      { label: CATALOG[2], on: true, file: null },
      { label: CATALOG[3], on: true, file },
      { label: CATALOG[4], on: true, file: null },
    ]);
    expect(compiled.querySelector('[role=status]')?.textContent).toContain('Déclarations enregistrées.');
    expect(service.getPage).toHaveBeenCalledTimes(2);
  });

  it('affiche le message du back quand l enregistrement échoue, sans recharger ni perdre les choix', async () => {
    await create();
    service.save.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 422, error: { error: 'Document justificatif introuvable.' } })));
    click(toggle('Agriculture raisonnée'));

    click([...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Enregistrer mes déclarations')!);

    expect(compiled.querySelector('[role=alert]')?.textContent).toContain('Document justificatif introuvable.');
    expect(service.getPage).toHaveBeenCalledTimes(1);
    expect(toggle('Agriculture raisonnée').getAttribute('aria-checked')).toBe('true');
  });

  it('affiche un message quand les labels ne peuvent pas être chargés', async () => {
    await create(throwError(() => new Error('API injoignable')));

    expect(compiled.textContent).toContain('Impossible de charger vos labels');
    expect(compiled.querySelector('ul')).toBeNull();
  });

  it('propose le retour à mon profil', async () => {
    await create();

    const back = compiled.querySelector('header a');
    expect(text(back)).toBe('Retour à mon profil');
    expect(back?.getAttribute('href')).toBe('/producer/profile');
  });
});
