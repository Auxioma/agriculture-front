import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from './dashboard.service';
import { ProducerDashboard } from './dashboard.model';

const request = (overrides: Partial<ProducerDashboard['requests'][number]>): ProducerDashboard['requests'][number] => ({
  requestId: Math.random().toString(),
  clientName: 'Client',
  product: 'Produit',
  quantity: null,
  unit: null,
  budgetMax: null,
  currency: null,
  city: null,
  distanceKm: null,
  message: null,
  urgent: false,
  clientType: 'individual',
  isNew: false,
  highVolume: false,
  ...overrides,
});

const DASHBOARD: ProducerDashboard = {
  farmName: 'Ferme Dupont',
  availableRequests: 4,
  urgentRequests: 2,
  unreadMessages: 5,
  requests: [
    request({ product: 'Tomates bio', quantity: 5, unit: 'kg', budgetMax: 12, currency: '€', city: 'Lyon', distanceKm: 4, urgent: true }),
    request({ product: 'Miel de fleurs', quantity: 2, unit: 'unite', city: 'Avignon', distanceKm: 9, message: 'souhaite une réponse rapide', urgent: true }),
    request({ product: 'Pommes Gala', quantity: 20, unit: 'kg', city: 'Vienne', distanceKm: 15 }),
    request({ product: 'Oeufs fermiers', quantity: 30, unit: 'unite', city: 'Villeurbanne', distanceKm: 6 }),
  ],
  subscription: { planName: 'Standard', status: 'active', requestsThisMonth: 24, requestsQuota: 30 },
  profile: { completion: 75, missing: ['labels', 'availability'] },
};

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let compiled: HTMLElement;
  let serviceMock: { getDashboard: ReturnType<typeof vi.fn> };

  async function create(data$: Observable<ProducerDashboard> = of(DASHBOARD)): Promise<void> {
    serviceMock = { getDashboard: vi.fn(() => data$) };
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([]), { provide: DashboardService, useValue: serviceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const requestRows = () => [...compiled.querySelectorAll('ul > li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
  const chip = (label: string) => [...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;

  beforeEach(() => TestBed.resetTestingModule());

  it('affiche le nom de la ferme et les trois chiffres du back', async () => {
    await create();

    expect(serviceMock.getDashboard).toHaveBeenCalled();
    expect(compiled.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Bonjour Ferme Dupont');
    const stats = [...compiled.querySelectorAll('.grid-cols-3 > div')].map((card) =>
      [...card.querySelectorAll('p')].map((p) => p.textContent?.trim()).join(' '),
    );
    expect(stats).toEqual(['4 Demandes disponibles', '2 Demandes urgentes', '5 Messages non lus']);
  });

  it('montre par défaut les demandes urgentes, avec titre et détails formatés', async () => {
    await create();

    expect(compiled.querySelector('h2')?.textContent).toContain('Demandes urgentes');
    const rows = requestRows();
    expect(rows.length).toBe(2);
    expect(rows[0]).toContain('Tomates bio - 5kg');
    expect(rows[0]).toContain('Lyon · 4 km · budget 12€/kg');
    expect(rows[0]).toContain('Urgent');
    expect(rows[1]).toContain('Miel de fleurs - 2 unités');
    expect(rows[1]).toContain('Avignon · 9 km · souhaite une réponse rapide');
  });

  it('les filtres "Tout" et "< 10 km" changent la liste et son titre', async () => {
    await create();

    chip('Tout').click();
    fixture.detectChanges();
    expect(requestRows().length).toBe(4);
    expect(compiled.querySelector('h2')?.textContent).toContain('Demandes disponibles');

    chip('< 10 km').click();
    fixture.detectChanges();
    expect(requestRows().length).toBe(3);
    expect(requestRows().join(' ')).not.toContain('Pommes Gala');
    expect(compiled.querySelector('h2')?.textContent).toContain('à moins de 10 km');
  });

  it('affiche l\'abonnement avec son quota et sa barre de progression', async () => {
    await create();
    const text = compiled.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(text).toContain('Abonnement · Plan Standard');
    expect(text).toContain('Actif');
    expect(text).toContain('24 demandes reçues sur 30 ce mois-ci');
    expect(compiled.querySelector<HTMLElement>('div[style*="80%"]')).toBeTruthy();
  });

  it('sans quota (forfait illimité) n\'affiche pas de barre, et sans abonnement propose les forfaits', async () => {
    await create(of({ ...DASHBOARD, subscription: { ...DASHBOARD.subscription!, requestsQuota: null } }));
    expect(compiled.textContent).toContain('24 demandes reçues ce mois-ci');
    expect(compiled.textContent).not.toContain('sur 30');

    TestBed.resetTestingModule();
    await create(of({ ...DASHBOARD, subscription: null }));
    expect(compiled.textContent).toContain("Vous n'avez pas encore d'abonnement.");
    expect(compiled.querySelector('a[href="/pricing"]')).toBeTruthy();
  });

  it('indique le taux de complétion du profil et ce qu\'il manque', async () => {
    await create();
    const text = compiled.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(text).toContain("Profil d'exploitation complété à 75 %");
    expect(text).toContain('Ajoutez vos labels et vos disponibilités pour être plus visible.');
    expect(compiled.querySelector<HTMLElement>('div[style*="75%"]')).toBeTruthy();

    TestBed.resetTestingModule();
    await create(of({ ...DASHBOARD, profile: { completion: 100, missing: [] } }));
    expect(compiled.textContent).toContain('Votre profil est complet.');
  });

  it('affiche un message quand le back ne répond pas', async () => {
    await create(throwError(() => new Error('API down')));

    expect(compiled.textContent).toContain('Impossible de charger votre tableau de bord');
  });
});
