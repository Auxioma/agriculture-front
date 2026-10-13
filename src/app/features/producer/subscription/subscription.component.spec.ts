import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CurrentSubscription, Invoice, PaymentCard, Plan, SubscriptionService } from './subscription.service';
import { SubscriptionComponent } from './subscription.component';

const plan = (code: string, name: string, monthly: number, yearly: number): Plan => ({
  id: code,
  code,
  name,
  description: null,
  prices: [
    { id: `${code}-m`, billingCycle: 'monthly', amount: `${monthly}.00`, currencyCode: 'EUR' },
    { id: `${code}-y`, billingCycle: 'yearly', amount: `${yearly}.00`, currencyCode: 'EUR' },
  ],
});

// dans l'ordre de l'admin : du plus bas au plus haut
const PLANS: Plan[] = [plan('essentiel', 'Essentiel', 12, 120), plan('pro', 'Pro', 24, 240), plan('premium', 'Premium', 49, 490)];

const current = (overrides: Partial<CurrentSubscription> = {}): CurrentSubscription => ({
  planPriceId: 'pro-m',
  planCode: 'pro',
  planName: 'Pro',
  billingCycle: 'monthly',
  amount: '24.00',
  currencyCode: 'EUR',
  status: 'active',
  currentPeriodEnd: '2026-09-01T10:00:00+00:00',
  cancelAtPeriodEnd: false,
  requestsThisMonth: 24,
  requestsQuota: 30,
  ...overrides,
});

const INVOICES: Invoice[] = [
  { id: 'i1', amount: '24.00', currencyCode: 'EUR', status: 'paid', invoiceUrl: 'https://invoices.test/1', createdAt: '2026-08-01T10:00:00+00:00' },
  { id: 'i2', amount: '24.00', currencyCode: 'EUR', status: 'paid', invoiceUrl: null, createdAt: '2026-07-01T10:00:00+00:00' },
];

const CARD: PaymentCard = { id: 'pm1', brand: 'visa', last4: '4242', expMonth: 8, expYear: 2028, isDefault: true };

describe('SubscriptionComponent', () => {
  let fixture: ComponentFixture<SubscriptionComponent>;
  let compiled: HTMLElement;
  let serviceMock: Record<'getPlans' | 'getCurrent' | 'getInvoices' | 'getCards' | 'checkout' | 'changePlan' | 'cancel', ReturnType<typeof vi.fn>>;
  let redirect: ReturnType<typeof vi.fn>;

  async function create(
    sub: Observable<CurrentSubscription | null> = of(current()),
    options: { invoices?: Invoice[]; cards?: Observable<PaymentCard[]>; query?: Record<string, string> } = {},
  ): Promise<void> {
    serviceMock = {
      getPlans: vi.fn(() => of(PLANS)),
      getCurrent: vi.fn(() => sub),
      getInvoices: vi.fn(() => of(options.invoices ?? INVOICES)),
      getCards: vi.fn(() => options.cards ?? of([CARD])),
      checkout: vi.fn(() => of({ checkoutUrl: 'https://pay.test/session' })),
      changePlan: vi.fn(() => of({ effect: 'immediate', effectiveAt: null })),
      cancel: vi.fn(() => of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [SubscriptionComponent],
      providers: [
        provideRouter([]),
        { provide: SubscriptionService, useValue: serviceMock },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(options.query ?? {}) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionComponent);
    redirect = vi.spyOn(fixture.componentInstance as unknown as { redirect: () => void }, 'redirect').mockImplementation(() => undefined) as unknown as ReturnType<typeof vi.fn>;
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = () => compiled.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  // les prix sont formates avec une espace insecable : on compare avec des espaces normales
  const plain = (element: Element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const button = (label: string) => [...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  const planCard = (name: string) => [...compiled.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find((b) => b.textContent?.includes(name))!;
  const click = (element: HTMLElement | undefined) => {
    element!.click();
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('résume le plan actuel : prix, renouvellement et demandes utilisées', async () => {
    await create();

    const summary = compiled.querySelector('section')!.textContent!.replace(/\s+/g, ' ');
    expect(summary).toContain('Plan Pro');
    expect(summary).toContain('Actif');
    expect(summary).toContain('24 €/mois');
    expect(summary).toContain('Renouvellement le 1er septembre 2026 · 24/30 demandes utilisées');
  });

  it('sans quota, compte seulement les demandes reçues', async () => {
    await create(of(current({ requestsQuota: null })));

    expect(text()).toContain('24 demandes reçues ce mois-ci');
  });

  it('sans abonnement, présente l\'offre gratuite et propose les offres', async () => {
    await create(of(null), { invoices: [] });

    expect(plain(compiled.querySelector('section')!)).toContain('Plan Gratuit');
    expect(plain(compiled.querySelector('section')!)).toContain('0 €');
    expect(text()).toContain('Profil limité, aperçu anonymisé des demandes.');
    expect(text()).not.toContain('Facturation');
    expect(button('Annuler mon abonnement')).toBeUndefined();
    expect(compiled.querySelectorAll('button[aria-pressed]').length).toBe(2 + PLANS.length);
  });

  it('un abonnement annulé ou expiré revient à l\'offre gratuite', async () => {
    await create(of(current({ status: 'expired' })));

    expect(compiled.querySelector('section')!.textContent).toContain('Plan Gratuit');
  });

  it('liste les offres de l\'admin avec leur prix, la sienne est repérée', async () => {
    await create();

    expect(plain(planCard('Essentiel'))).toContain('12 €/mois');
    expect(planCard('Pro').getAttribute('aria-pressed')).toBe('true');
    expect(plain(planCard('Premium'))).toContain('49 €/mois');
    expect(planCard('Premium').getAttribute('aria-pressed')).toBe('false');
  });

  it('l\'annuel affiche les prix à l\'année et l\'économie par rapport au mensuel', async () => {
    await create();

    click(button('Annuel'));

    expect(plain(planCard('Essentiel'))).toContain('120 €/an');
    expect(plain(planCard('Pro'))).toContain('240 €/an');
    // 12 mensualités de 24 € = 288 € : 240 € est 17 % moins cher
    expect(plain(planCard('Pro'))).toContain('17 % moins cher que le mensuel');
    expect(button('Annuel')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('choisir son offre actuelle ne fait rien', async () => {
    await create();

    click(planCard('Pro'));

    expect(text()).not.toContain('Confirmer');
  });

  it('monter d\'offre est immédiat : confirmation, appel du back puis rechargement', async () => {
    await create();

    click(planCard('Premium'));
    expect(text()).toContain('Le changement prend effet immédiatement.');
    click(button('Confirmer'));

    expect(serviceMock.changePlan).toHaveBeenCalledWith('premium-m');
    expect(text()).toContain('Votre passage au plan Premium est en cours : il prend effet immédiatement.');
    expect(serviceMock.getCurrent).toHaveBeenCalledTimes(2);
  });

  it('descendre d\'offre prend effet à la prochaine échéance', async () => {
    await create();
    serviceMock.changePlan.mockReturnValue(of({ effect: 'next_renewal', effectiveAt: '2026-09-01T10:00:00+00:00' }));

    click(planCard('Essentiel'));
    expect(text()).toContain('Le changement prendra effet à la prochaine échéance, le 1er septembre 2026.');
    click(button('Confirmer'));

    expect(serviceMock.changePlan).toHaveBeenCalledWith('essentiel-m');
    expect(text()).toContain('Votre plan passera à Essentiel le 1er septembre 2026.');
  });

  it('on peut renoncer au changement', async () => {
    await create();

    click(planCard('Premium'));
    click(button('Annuler'));

    expect(text()).not.toContain('Confirmer');
    expect(serviceMock.changePlan).not.toHaveBeenCalled();
  });

  it('sans abonnement, souscrire envoie sur la page de paiement', async () => {
    await create(of(null), { invoices: [] });

    click(planCard('Pro'));
    expect(text()).toContain('redirigé vers la page de paiement');
    click(button('Confirmer'));

    expect(serviceMock.checkout).toHaveBeenCalledWith('pro-m');
    expect(redirect).toHaveBeenCalledWith('https://pay.test/session');
    expect(serviceMock.changePlan).not.toHaveBeenCalled();
  });

  it('affiche le message du back quand l\'offre est refusée', async () => {
    await create();
    serviceMock.changePlan.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 502, error: { error: 'Le service de paiement est momentanément indisponible.' } })));

    click(planCard('Premium'));
    click(button('Confirmer'));

    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('momentanément indisponible');
  });

  it('la facturation montre la carte, le lien pour la modifier et les factures téléchargeables', async () => {
    await create();

    expect(text()).toContain('Facturation');
    expect(text()).toContain('Carte bancaire •••• 4242');
    expect(compiled.querySelector('a[href="/producer/subscription/payment-methods"]')?.textContent?.trim()).toBe('Modifier');
    const items = [...compiled.querySelectorAll('section:nth-of-type(2) ul li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(items).toEqual(['1er août 2026 24 €', '1er juillet 2026 24 €']);
    expect(compiled.querySelector('a[href="https://invoices.test/1"]')?.getAttribute('aria-label')).toBe('Télécharger la facture du 1er août 2026');
    expect(compiled.querySelectorAll('a[aria-label^="Télécharger"]').length).toBe(1);
  });

  it('une facture dont le paiement a échoué le dit', async () => {
    await create(of(current()), { invoices: [{ ...INVOICES[0], status: 'failed' }, INVOICES[1]] });

    const items = [...compiled.querySelectorAll('section:nth-of-type(2) ul li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(items).toEqual(['1er août 2026Paiement échoué 24 €', '1er juillet 2026 24 €']);
  });

  it('sans facture ni carte lisible, reste utilisable', async () => {
    await create(of(current()), { invoices: [], cards: throwError(() => new Error('Stripe indisponible')) });

    expect(text()).toContain('Aucune facture pour le moment.');
    expect(text()).toContain('Moyen de paiement');
    expect(compiled.querySelector('a[href="/producer/subscription/payment-methods"]')).toBeTruthy();
  });

  it('le bouton Support mène à la page Support', async () => {
    await create();

    expect(compiled.querySelector('a[href="/producer/support"]')?.textContent?.trim()).toBe('Support');
  });

  it('annule l\'abonnement après confirmation, il reste actif jusqu\'à la fin de la période', async () => {
    await create();

    click(button('Annuler mon abonnement'));
    expect(text()).toContain('reste actif jusqu\'au 1er septembre 2026');
    click(button('Annuler mon abonnement'));

    expect(serviceMock.cancel).toHaveBeenCalledTimes(1);
    expect(text()).toContain('Annulation enregistrée');
    expect(serviceMock.getCurrent).toHaveBeenCalledTimes(2);
  });

  it('on peut garder son abonnement', async () => {
    await create();

    click(button('Annuler mon abonnement'));
    click(button('Garder mon abonnement'));

    expect(serviceMock.cancel).not.toHaveBeenCalled();
    expect(button('Annuler mon abonnement')).toBeTruthy();
  });

  it('un abonnement déjà annulé indique sa fin et ne propose plus d\'annuler', async () => {
    await create(of(current({ cancelAtPeriodEnd: true })));

    expect(text()).toContain('Annulation prévue');
    expect(text()).toContain('Fin de l’abonnement le 1er septembre 2026');
    expect(button('Annuler mon abonnement')).toBeUndefined();
  });

  it('un paiement en retard prévient et mène aux cartes', async () => {
    await create(of(current({ status: 'past_due' })));

    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Le dernier paiement a échoué');
    expect(text()).toContain('Paiement en retard');
    expect(text()).toContain('Mettre à jour ma carte');
  });

  it('au retour de la page de paiement, confirme ou annonce l\'abandon', async () => {
    await create(of(current()), { query: { checkout: 'success' } });
    expect(text()).toContain('Paiement reçu');

    TestBed.resetTestingModule();
    await create(of(current()), { query: { checkout: 'cancelled' } });
    expect(text()).toContain('Paiement annulé');
  });

  it('affiche un message quand le back est injoignable', async () => {
    await create(throwError(() => new Error('API down')));

    expect(text()).toContain('Impossible de charger votre abonnement');
  });
});
