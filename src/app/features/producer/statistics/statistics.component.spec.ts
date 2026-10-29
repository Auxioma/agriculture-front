import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatisticsComponent } from './statistics.component';
import { Statistics, StatisticsService } from './statistics.service';

const stats = (overrides: Partial<Statistics> = {}): Statistics => ({
  profileViews: 248,
  requestsReceived: 32,
  replies: 28,
  conversations: 18,
  responseRate: 87.5,
  requestsByMonth: [
    { month: '2026-03', count: 12 },
    { month: '2026-04', count: 16 },
    { month: '2026-05', count: 10 },
    { month: '2026-06', count: 24 },
    { month: '2026-07', count: 1 },
    { month: '2026-08', count: 32 },
  ],
  estimatedRoi: { currency: 'EUR', subscriptionCost: 29, costPerRequestReceived: 0.91, costPerConversationOpened: 1.61 },
  ...overrides,
});

describe('StatisticsComponent', () => {
  let fixture: ComponentFixture<StatisticsComponent>;
  let compiled: HTMLElement;

  async function create(data$: Observable<Statistics> = of(stats())): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [StatisticsComponent],
      providers: [provideRouter([]), { provide: StatisticsService, useValue: { get: vi.fn(() => data$) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticsComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = () => compiled.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  // le chiffre puis son libelle, chacun dans son paragraphe
  const cards = () => [...compiled.querySelectorAll('ul > li')].map((li) => [...li.querySelectorAll('p')].map((p) => p.textContent?.replace(/\s+/g, ' ').trim()).join(' '));
  const bars = () => [...compiled.querySelectorAll('ol > li')];

  beforeEach(() => TestBed.resetTestingModule());

  it('affiche les quatre chiffres de la maquette dans son ordre, puis les deux du cahier', async () => {
    await create();

    expect(cards()).toEqual([
      '248 Vues du profil',
      '32 Demandes reçues',
      '88 % Taux de réponse',
      '18 Conversations',
      '28 Réponses envoyées',
      '0,91 € Coût par demande reçue',
    ]);
  });

  it('explique que le coût par demande est une estimation', async () => {
    await create();

    expect(text()).toContain('ROI estimé');
    expect(text()).toContain('la plateforme ne connaît pas vos ventes');
  });

  it('sans demande ni abonnement actif, le taux et le coût sont des tirets, pas des zéros', async () => {
    await create(
      of(stats({ requestsReceived: 0, replies: 0, conversations: 0, responseRate: null, estimatedRoi: { currency: null, subscriptionCost: null, costPerRequestReceived: null, costPerConversationOpened: null } })),
    );

    expect(cards()).toContain('— Taux de réponse');
    expect(cards()).toContain('— Coût par demande reçue');
    expect(cards()).toContain('0 Demandes reçues');
  });

  it('trace une colonne par mois, avec son mois et son nombre, et le mois en cours en vert', async () => {
    await create();

    expect(bars().map((li) => li.getAttribute('aria-label'))).toEqual([
      'Mars : 12 demandes',
      'Avr : 16 demandes',
      'Mai : 10 demandes',
      'Juin : 24 demandes',
      'Juil : 1 demande',
      'Août : 32 demandes',
    ]);
    const fills = bars().map((li) => li.querySelector<HTMLElement>('.block')!);
    expect(fills.map((f) => f.classList.contains('bg-agri'))).toEqual([false, false, false, false, false, true]);
    expect(fills[5].style.height).toBe('100%');
    expect(fills[2].style.height).toBe('31%');
  });

  it('ne dit pas « 0 demandes » : un mois sans demande garde un trait et se lit « 0 demande »', async () => {
    await create(of(stats({ requestsByMonth: [{ month: '2026-07', count: 0 }, { month: '2026-08', count: 4 }] })));

    expect(bars()[0].getAttribute('aria-label')).toBe('Juil : 0 demande');
    expect(bars()[0].querySelector<HTMLElement>('.block')!.style.height).toBe('3%');
  });

  it('dit qu’il n’y a rien à tracer quand aucune demande n’est arrivée en six mois', async () => {
    await create(of(stats({ requestsByMonth: [{ month: '2026-07', count: 0 }, { month: '2026-08', count: 0 }] })));

    expect(text()).toContain('Aucune demande reçue sur les 6 derniers mois.');
    expect(compiled.querySelector('ol')).toBeNull();
  });

  it('ramène au profil', async () => {
    await create();

    expect(compiled.querySelector('a[href="/producer/profile"]')?.textContent?.trim()).toBe('Retour au profil');
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Statistiques');
  });

  it('une offre sans statistiques (403) le dit, renvoie aux abonnements et ne montre aucun chiffre', async () => {
    await create(throwError(() => new HttpErrorResponse({ status: 403, error: { error: 'Les statistiques ne sont pas comprises dans votre abonnement.' } })));

    expect(text()).toContain('Les statistiques ne sont pas comprises dans votre abonnement.');
    expect(compiled.querySelector('a[href="/producer/subscription"]')?.textContent?.trim()).toBe('Voir les abonnements');
    expect(cards()).toEqual([]);
    expect(text()).not.toContain('Impossible de charger');
  });

  it('un autre échec est présenté comme tel, sans proposer de s’abonner', async () => {
    await create(throwError(() => new HttpErrorResponse({ status: 500 })));

    expect(text()).toContain('Impossible de charger les statistiques pour le moment.');
    expect(compiled.querySelector('a[href="/producer/subscription"]')).toBeNull();
  });
});
