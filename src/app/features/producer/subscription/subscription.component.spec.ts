import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CurrentSubscription, Invoice, PaymentCard, Plan, ScheduledChange, SubscriptionService } from './subscription.service';
import { SubscriptionComponent } from './subscription.component';

const plan = (code: string, name: string, monthly: number, yearly: number): Plan => ({
  id: code,
  code,
  name,
  description: null,
  features: null,
  limits: null,
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

// une descente deja programmee chez Stripe
const CHANGE: ScheduledChange = {
  planPriceId: 'essentiel-m',
  planCode: 'essentiel',
  planName: 'Essentiel',
  billingCycle: 'monthly',
  amount: '12.00',
  currencyCode: 'EUR',
  effectiveAt: '2026-09-01T10:00:00+00:00',
};

const CARD: PaymentCard = { id: 'pm1', brand: 'visa', last4: '4242', expMonth: 8, expYear: 2028, isDefault: true };

describe('SubscriptionComponent', () => {
  let fixture: ComponentFixture<SubscriptionComponent>;
  let compiled: HTMLElement;
  let serviceMock: Record<'getPlans' | 'getCurrent' | 'getInvoices' | 'getCards' | 'getScheduledChange' | 'checkout' | 'changePlan' | 'cancel' | 'resume', ReturnType<typeof vi.fn>>;
  let redirect: ReturnType<typeof vi.fn>;

  async function create(
    sub: Observable<CurrentSubscription | null> = of(current()),
    options: { invoices?: Invoice[]; cards?: Observable<PaymentCard[]>; scheduled?: ScheduledChange | null; query?: Record<string, string>; now?: Date } = {},
  ): Promise<void> {
    // temps simule : la relecture apres paiement se fait toutes les 2 s, les tests la font avancer a la main
    vi.useFakeTimers();
    // * date figée, le quota se remet à zéro le 1er du mois suivant (donc ça change selon le jour où on lance les tests)
    vi.setSystemTime(options.now ?? new Date(2026, 7, 18, 10));
    serviceMock = {
      getPlans: vi.fn(() => of(PLANS)),
      getCurrent: vi.fn(() => sub),
      getInvoices: vi.fn(() => of(options.invoices ?? INVOICES)),
      getCards: vi.fn(() => options.cards ?? of([CARD])),
      getScheduledChange: vi.fn(() => of(options.scheduled ?? null)),
      checkout: vi.fn(() => of({ checkoutUrl: 'https://pay.test/session' })),
      changePlan: vi.fn(() => of({ effect: 'immediate', effectiveAt: null })),
      cancel: vi.fn(() => of(undefined)),
      resume: vi.fn(() => of(undefined)),
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
  const dialog = () => compiled.querySelector<HTMLElement>('[role="dialog"]');
  const click = (element: HTMLElement | undefined) => {
    element!.click();
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());
  afterEach(() => vi.useRealTimers());

  // fait avancer le temps simule puis rafraichit l'affichage
  const wait = async (ms: number) => {
    await vi.advanceTimersByTimeAsync(ms);
    fixture.detectChanges();
  };

  it('résume le plan actuel : prix, renouvellement et demandes reçues', async () => {
    await create();

    const summary = compiled.querySelector('section')!.textContent!.replace(/\s+/g, ' ');
    expect(summary).toContain('Plan Pro');
    expect(summary).toContain('Actif');
    expect(summary).toContain('24 €/mois');
    expect(summary).toContain('Renouvellement le 1er septembre 2026 · 24/30 demandes reçues ce mois-ci (quota remis à zéro le 1er septembre)');
  });

  it('sans quota, compte seulement les demandes reçues', async () => {
    await create(of(current({ requestsQuota: null })));

    expect(text()).toContain('24 demandes reçues ce mois-ci');
    expect(text()).not.toContain('remis à zéro');
  });

  // le quota suit le mois calendaire, pas le renouvellement : le 1er du mois suivant, même en fin d'année
  it('dit quand le quota est remis à zéro : le 1er du mois suivant', async () => {
    await create(of(current()), { now: new Date(2026, 11, 20, 10) });

    expect(plain(compiled.querySelector('section')!)).toContain('(quota remis à zéro le 1er janvier)');
  });

  it('dit pareil au milieu du mois, même loin du renouvellement', async () => {
    await create(of(current({ currentPeriodEnd: '2026-08-31T10:00:00+00:00' })), { now: new Date(2026, 9, 14, 10) });

    expect(plain(compiled.querySelector('section')!)).toContain('(quota remis à zéro le 1er novembre)');
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

    expect(dialog()).toBeNull();
  });

  it('monter d\'offre est immédiat : confirmation, appel du back puis relecture', async () => {
    await create();

    click(planCard('Premium'));
    expect(plain(dialog()!)).toContain('Le changement prend effet immédiatement');
    // cahier : conditions d'upgrade transparentes, la différence est facturée tout de suite et non le prix plein
    expect(plain(dialog()!)).toContain('seule la différence avec ce que vous avez déjà payé pour la période en cours (calcul au prorata) est facturée aujourd’hui');
    expect(plain(dialog()!)).toContain('Si le paiement est refusé, votre abonnement ne change pas.');
    expect(plain(dialog()!)).toContain('Le plan se renouvelle automatiquement chaque mois.');
    // pas de crédit à expliquer quand on monte d'offre
    expect(plain(dialog()!)).not.toContain('crédit');
    click(button('J’accepte'));

    expect(serviceMock.changePlan).toHaveBeenCalledWith('premium-m');
    expect(dialog()).toBeNull();
    expect(text()).toContain('Votre passage au plan Premium est en cours : il prend effet immédiatement.');
    await wait(0);
    expect(serviceMock.getCurrent).toHaveBeenCalledTimes(2);
  });

  it('après une montée d\'offre, attend que le webhook ait changé le plan puis le confirme', async () => {
    await create();
    click(planCard('Premium'));
    click(button('J’accepte'));

    // le webhook de Stripe n'est pas encore passé
    await wait(0);
    expect(text()).toContain('est en cours');
    expect(compiled.querySelector('[role="status"]')?.getAttribute('aria-busy')).toBe('true');

    serviceMock.getCurrent.mockReturnValue(of(current({ planPriceId: 'premium-m', planCode: 'premium', planName: 'Premium', amount: '49.00' })));
    await wait(2000);

    expect(text()).toContain('Votre plan est maintenant Premium.');
    expect(compiled.querySelector('[role="status"]')?.getAttribute('aria-busy')).toBe('false');
    expect(plain(compiled.querySelector('section')!)).toContain('Plan Premium');
  });

  it('descendre d\'offre prend effet à la prochaine échéance', async () => {
    await create();
    serviceMock.changePlan.mockReturnValue(of({ effect: 'next_renewal', effectiveAt: '2026-09-01T10:00:00+00:00' }));

    click(planCard('Essentiel'));
    expect(plain(dialog()!)).toContain('Rien n’est facturé et vous gardez le plan Pro jusqu’à la prochaine échéance, le 1er septembre 2026.');
    expect(plain(dialog()!)).toContain('vous passez au plan Essentiel (12 €/mois), facturé à chaque renouvellement');
    click(button('J’accepte'));

    expect(serviceMock.changePlan).toHaveBeenCalledWith('essentiel-m');
    expect(text()).toContain('Votre plan passera à Essentiel le 1er septembre 2026.');
  });

  it('on peut renoncer au changement', async () => {
    await create();

    click(planCard('Premium'));
    click(button('Annuler'));

    expect(dialog()).toBeNull();
    expect(serviceMock.changePlan).not.toHaveBeenCalled();
  });

  it('le changement s\'explique dans une carte sur fond flou, rien n\'est envoyé tant qu\'on n\'a pas accepté', async () => {
    await create();

    click(planCard('Premium'));

    expect(dialog()!.getAttribute('aria-modal')).toBe('true');
    expect(plain(dialog()!)).toContain('Passer au plan Premium');
    expect(plain(dialog()!)).toContain('49 €/mois');
    expect(dialog()!.parentElement!.className).toContain('backdrop-blur');
    expect(button('J’accepte')).toBeTruthy();
    expect(serviceMock.changePlan).not.toHaveBeenCalled();
    expect(serviceMock.checkout).not.toHaveBeenCalled();
  });

  it('derrière la carte, la page est inerte', async () => {
    await create();
    expect(compiled.querySelector('[inert]')).toBeNull();

    click(planCard('Premium'));
    expect(compiled.querySelector('[inert]')).not.toBeNull();
    expect(compiled.querySelector('[inert]')!.contains(dialog())).toBe(false);

    click(button('Annuler'));
    expect(compiled.querySelector('[inert]')).toBeNull();
  });

  it('la carte prend le focus à l\'ouverture', async () => {
    await create();

    click(planCard('Premium'));

    expect(document.activeElement).toBe(dialog());
  });

  it('la touche Échap ferme la carte sans rien envoyer', async () => {
    await create();
    click(planCard('Premium'));

    dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    expect(serviceMock.changePlan).not.toHaveBeenCalled();
  });

  it('un clic sur le fond flou ferme la carte, un clic dans la carte non', async () => {
    await create();
    click(planCard('Premium'));

    click(dialog()!);
    expect(dialog()).not.toBeNull();

    click(dialog()!.parentElement as HTMLElement);
    expect(dialog()).toBeNull();
    expect(serviceMock.changePlan).not.toHaveBeenCalled();
  });

  it('pendant l\'appel au back, la carte ne se ferme pas et ne peut pas être acceptée deux fois', async () => {
    await create();
    serviceMock.changePlan.mockReturnValue(NEVER);
    click(planCard('Premium'));
    click(button('J’accepte'));

    expect(button('J’accepte')!.disabled).toBe(true);
    expect(button('Annuler')!.disabled).toBe(true);
    dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    click(dialog()!.parentElement as HTMLElement);
    expect(dialog()).not.toBeNull();
    button('J’accepte')!.click();
    expect(serviceMock.changePlan).toHaveBeenCalledTimes(1);
  });

  it('l\'erreur du paiement s\'affiche dans la carte, une seule fois, et la carte reste ouverte', async () => {
    await create();
    serviceMock.changePlan.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 402, error: { error: 'Le paiement de ce changement d\'offre n\'a pas abouti : votre abonnement n\'a pas changé.' } })));

    click(planCard('Premium'));
    click(button('J’accepte'));

    const alerts = compiled.querySelectorAll('[role="alert"]');
    expect(alerts.length).toBe(1);
    expect(dialog()!.contains(alerts[0])).toBe(true);
    expect(alerts[0].textContent).toContain('votre abonnement n\'a pas changé');
    expect(button('J’accepte')!.disabled).toBe(false);
  });

  it('renoncer après une erreur efface le message', async () => {
    await create();
    serviceMock.changePlan.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 502, error: { error: 'Le service de paiement est momentanément indisponible.' } })));
    click(planCard('Premium'));
    click(button('J’accepte'));

    click(button('Annuler'));

    expect(dialog()).toBeNull();
    expect(compiled.querySelector('[role="alert"]')).toBeNull();
  });

  // Cahier fonctionnel : "Annuel : engagement annuel". Sous engagement, le mensuel attend la fin de la période (même vers un plan plus haut)
  it('sous engagement annuel, passer au mensuel attend la fin de l\'engagement, sans rien facturer ni rendre', async () => {
    await create(of(current({ planPriceId: 'pro-y', billingCycle: 'yearly', amount: '240.00' })));
    serviceMock.changePlan.mockReturnValue(of({ effect: 'next_renewal', effectiveAt: '2026-09-01T10:00:00+00:00' }));
    click(button('Mensuel'));

    click(planCard('Pro'));

    expect(plain(dialog()!)).toContain('Rien n’est facturé et vous gardez le plan Pro jusqu’à la fin de votre engagement annuel, le 1er septembre 2026.');
    expect(plain(dialog()!)).toContain('vous passez au plan Pro (24 €/mois), facturé à chaque renouvellement');
    expect(plain(dialog()!)).not.toContain('crédit');
    click(button('J’accepte'));

    expect(serviceMock.changePlan).toHaveBeenCalledWith('pro-m');
    expect(text()).toContain('Votre plan passera à Pro le 1er septembre 2026.');
  });

  it('sous engagement annuel, un plan plus haut en mensuel attend aussi la fin de l\'engagement', async () => {
    await create(of(current({ planPriceId: 'pro-y', billingCycle: 'yearly', amount: '240.00' })));
    click(button('Mensuel'));

    click(planCard('Premium'));

    expect(plain(dialog()!)).toContain('jusqu’à la fin de votre engagement annuel, le 1er septembre 2026');
    expect(plain(dialog()!)).toContain('vous passez au plan Premium (49 €/mois)');
    expect(plain(dialog()!)).not.toContain('Le changement prend effet immédiatement');
  });

  it('sous engagement annuel, monter vers une offre annuelle reste immédiat et l\'engagement continue', async () => {
    await create(of(current({ planPriceId: 'pro-y', billingCycle: 'yearly', amount: '240.00' })));

    click(planCard('Premium'));

    expect(plain(dialog()!)).toContain('Le changement prend effet immédiatement');
    expect(plain(dialog()!)).toContain('Votre engagement annuel continue jusqu’au 1er septembre 2026.');
    expect(plain(dialog()!)).toContain('Le plan se renouvelle automatiquement chaque année.');
    expect(plain(dialog()!)).not.toContain('Vous vous engagez pour 12 mois');
  });

  it('du mensuel à l\'annuel, un engagement de 12 mois commence aujourd\'hui', async () => {
    await create();
    click(button('Annuel'));

    click(planCard('Premium'));

    expect(plain(dialog()!)).toContain('Le changement prend effet immédiatement');
    expect(plain(dialog()!)).toContain('Vous vous engagez pour 12 mois à partir d’aujourd’hui');
    expect(plain(dialog()!)).toContain('sans remboursement');
  });

  it('du mensuel au mensuel, aucun engagement n\'est annoncé', async () => {
    await create();

    click(planCard('Premium'));

    expect(plain(dialog()!)).not.toContain('engage');
  });

  it('l\'engagement annuel est annoncé dans le résumé, pas pour le mensuel', async () => {
    await create(of(current({ planPriceId: 'pro-y', billingCycle: 'yearly', amount: '240.00' })));
    expect(plain(compiled.querySelector('section')!)).toContain('Engagement annuel · Renouvellement le 1er septembre 2026');

    TestBed.resetTestingModule();
    await create();
    expect(plain(compiled.querySelector('section')!)).not.toContain('Engagement annuel');
  });

  it('annuel annulé : le résumé donne la fin de l\'abonnement, pas un engagement qui continue', async () => {
    await create(of(current({ planPriceId: 'pro-y', billingCycle: 'yearly', amount: '240.00', cancelAtPeriodEnd: true })));

    expect(plain(compiled.querySelector('section')!)).toContain('Fin de l’abonnement le 1er septembre 2026');
    expect(plain(compiled.querySelector('section')!)).not.toContain('Engagement annuel');
  });

  it('annuler un abonnement annuel rappelle l\'engagement : actif jusqu\'à la fin, sans remboursement', async () => {
    await create(of(current({ planPriceId: 'pro-y', billingCycle: 'yearly', amount: '240.00' })));

    click(button('Annuler mon abonnement'));

    expect(text()).toContain('reste actif jusqu\'au 1er septembre 2026, fin de votre engagement annuel (sans remboursement)');
  });

  it('une facture payée à 0 € (réglée par le crédit) ne montre pas « 0 € » mais « Rien à payer »', async () => {
    const invoices: Invoice[] = [
      { id: 'i0', amount: '0.00', currencyCode: 'EUR', status: 'paid', invoiceUrl: 'https://invoices.test/0', createdAt: '2026-08-01T10:00:00+00:00' },
      { id: 'i1', amount: '49.00', currencyCode: 'EUR', status: 'paid', invoiceUrl: 'https://invoices.test/1', createdAt: '2026-07-01T10:00:00+00:00' },
      { id: 'i2', amount: '19.00', currencyCode: 'EUR', status: 'failed', invoiceUrl: null, createdAt: '2026-06-01T10:00:00+00:00' },
    ];
    await create(of(current()), { invoices });

    const lines = [...compiled.querySelectorAll('section:nth-of-type(2) ul li')].map((li) => plain(li));
    expect(lines[0]).toContain('Rien à payer');
    expect(lines[0]).not.toContain('0 €');
    // la facture reste téléchargeable
    expect(compiled.querySelectorAll('section:nth-of-type(2) ul li')[0].querySelector('a[href="https://invoices.test/0"]')).toBeTruthy();
    expect(lines[1]).toContain('49 €');
    expect(lines[2]).toContain('Paiement échoué');
    expect(lines[2]).toContain('19 €');
  });

  it('sans abonnement, souscrire envoie sur la page de paiement', async () => {
    await create(of(null), { invoices: [] });

    click(planCard('Pro'));
    expect(plain(dialog()!)).toContain('Souscrire au plan Pro');
    expect(plain(dialog()!)).toContain('Vous êtes redirigé vers la page de paiement sécurisée de Stripe et vous réglez 24 €/mois.');
    expect(plain(dialog()!)).toContain('se renouvelle automatiquement chaque mois');
    expect(serviceMock.checkout).not.toHaveBeenCalled();
    click(button('J’accepte'));

    expect(serviceMock.checkout).toHaveBeenCalledWith('pro-m');
    expect(redirect).toHaveBeenCalledWith('https://pay.test/session');
    expect(serviceMock.changePlan).not.toHaveBeenCalled();
  });

  it('sans abonnement, un abonnement annuel annonce l\'engagement de 12 mois et se renouvelle chaque année', async () => {
    await create(of(null), { invoices: [] });

    click(button('Annuel'));
    click(planCard('Pro'));

    expect(plain(dialog()!)).toContain('vous réglez 240 €/an');
    expect(plain(dialog()!)).toContain('Vous vous engagez pour 12 mois');
    expect(plain(dialog()!)).toContain('se renouvelle automatiquement chaque année');
    expect(plain(dialog()!)).toContain('l’annulation prend effet à la fin de l’engagement, sans remboursement');
  });

  it('sans abonnement, un abonnement mensuel n\'annonce aucun engagement', async () => {
    await create(of(null), { invoices: [] });

    click(planCard('Pro'));

    expect(plain(dialog()!)).not.toContain('engage');
    expect(plain(dialog()!)).toContain('Vous pouvez l’annuler à tout moment depuis cette page');
  });

  it('affiche le message du back quand l\'offre est refusée', async () => {
    await create();
    serviceMock.changePlan.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 502, error: { error: 'Le service de paiement est momentanément indisponible.' } })));

    click(planCard('Premium'));
    click(button('J’accepte'));

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

  // annuler libère le changement d'offre prévu chez Stripe, reprendre ne le remet pas : la page le dit avant et après
  it('annuler avec un changement d\'offre prévu : la carte d\'annulation dit qu\'il tombe, et le message après aussi', async () => {
    await create(of(current()), { scheduled: CHANGE });

    click(button('Annuler mon abonnement'));
    expect(text()).toContain('Le passage au plan Essentiel prévu le 1er septembre 2026 est annulé avec l\'abonnement');
    expect(text()).toContain('ce changement ne sera pas rétabli');
    // le changement prévu disparait de la page une fois l'annulation faite
    serviceMock.getScheduledChange.mockReturnValue(of(null));
    click(button('Annuler mon abonnement'));

    expect(text()).toContain('Annulation enregistrée : votre abonnement reste actif jusqu’à la fin de la période payée. Le passage au plan Essentiel prévu le 1er septembre 2026 n’aura pas lieu.');
    expect(plain(compiled.querySelector('section')!)).not.toContain('Passage au plan');
  });

  it('annuler sans changement d\'offre prévu : rien à dire sur un changement', async () => {
    await create();

    click(button('Annuler mon abonnement'));
    expect(text()).not.toContain('ne sera pas rétabli');
    click(button('Annuler mon abonnement'));

    expect(text()).toContain('Annulation enregistrée');
    expect(text()).not.toContain('n’aura pas lieu');
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
    expect(button('Reprendre mon abonnement')).toBeTruthy();
  });

  it('on ne propose pas de reprendre un abonnement qui n\'est pas annulé', async () => {
    await create();

    expect(button('Reprendre mon abonnement')).toBeUndefined();
  });

  it('reprend un abonnement annulé : il se renouvellera', async () => {
    await create(of(current({ cancelAtPeriodEnd: true })));
    serviceMock.getCurrent.mockReturnValue(of(current()));

    click(button('Reprendre mon abonnement'));

    expect(serviceMock.resume).toHaveBeenCalledTimes(1);
    expect(text()).toContain('Votre abonnement est repris : il se renouvellera le 1er septembre 2026 sur le plan Pro, sans changement d’offre prévu.');
    expect(serviceMock.getCurrent).toHaveBeenCalledTimes(2);
    expect(button('Reprendre mon abonnement')).toBeUndefined();
    expect(button('Annuler mon abonnement')).toBeTruthy();
  });

  it('affiche le message du back quand la reprise est refusée', async () => {
    await create(of(current({ cancelAtPeriodEnd: true })));
    serviceMock.resume.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'Cet abonnement est déjà terminé : souscrivez de nouveau.' } })));

    click(button('Reprendre mon abonnement'));

    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('déjà terminé');
    expect(button('Reprendre mon abonnement')).toBeTruthy();
  });

  it('montre la descente d\'offre déjà programmée, avec son prix et sa date', async () => {
    await create(of(current()), { scheduled: CHANGE });

    expect(plain(compiled.querySelector('section')!)).toContain('Passage au plan Essentiel (12 €/mois) prévu le 1er septembre 2026.');
  });

  it('sans changement programmé, ne dit rien', async () => {
    await create();

    expect(text()).not.toContain('Passage au plan');
  });

  it('programmer une descente la fait apparaître tout de suite', async () => {
    await create();
    serviceMock.changePlan.mockReturnValue(of({ effect: 'next_renewal', effectiveAt: '2026-09-01T10:00:00+00:00' }));
    serviceMock.getScheduledChange.mockReturnValue(of(CHANGE));

    click(planCard('Essentiel'));
    click(button('J’accepte'));

    expect(serviceMock.getScheduledChange).toHaveBeenCalledTimes(2);
    expect(plain(compiled.querySelector('section')!)).toContain('Passage au plan Essentiel (12 €/mois) prévu le 1er septembre 2026.');
  });

  it('un paiement en retard prévient et mène aux cartes', async () => {
    await create(of(current({ status: 'past_due' })));

    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Le dernier paiement a échoué');
    expect(text()).toContain('Paiement en retard');
    expect(text()).toContain('Mettre à jour ma carte');
  });

  // Stripe affiche déjà la période suivante quand un renouvellement échoue : la date de fin de période n'est pas l'échéance
  it('en retard de paiement, dit que le paiement attend au lieu d\'une date de renouvellement', async () => {
    await create(of(current({ status: 'past_due' })));

    expect(plain(compiled.querySelector('section')!)).toContain('Paiement en attente · 24/30 demandes reçues ce mois-ci');
    expect(plain(compiled.querySelector('section')!)).not.toContain('Renouvellement le');
  });

  it('en retard de paiement et annulé, la fin de l\'abonnement reste affichée', async () => {
    await create(of(current({ status: 'past_due', cancelAtPeriodEnd: true })));

    expect(plain(compiled.querySelector('section')!)).toContain('Fin de l’abonnement le 1er septembre 2026');
    expect(plain(compiled.querySelector('section')!)).not.toContain('Paiement en attente');
  });

  it('en retard de paiement, les autres offres sont désactivées : le back refuserait le changement, la page le dit avant', async () => {
    await create(of(current({ status: 'past_due' })));

    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Vous pourrez changer d’offre une fois le paiement régularisé');
    expect(planCard('Premium').disabled).toBe(true);
    expect(planCard('Essentiel').disabled).toBe(true);
    expect(planCard('Pro').disabled).toBe(false);

    click(planCard('Premium'));
    // même sans le bouton, le composant refuse d'ouvrir la carte
    const premium = fixture.componentInstance.cards().find((c) => c.plan.code === 'premium')!;
    fixture.componentInstance.select(premium);
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    expect(serviceMock.changePlan).not.toHaveBeenCalled();
  });

  // annulation programmée : le back refuse (409), sur Stripe une descente aurait effacé l'annulation toute seule
  it('annulation programmée : les autres offres sont désactivées, la page dit de reprendre l\'abonnement', async () => {
    await create(of(current({ cancelAtPeriodEnd: true })));

    expect(text()).toContain('Votre abonnement est en cours d’annulation : reprenez-le pour changer d’offre.');
    expect(planCard('Premium').disabled).toBe(true);
    expect(planCard('Essentiel').disabled).toBe(true);
    expect(planCard('Pro').disabled).toBe(false);

    click(planCard('Premium'));
    // même sans le bouton, le composant refuse d'ouvrir la carte
    fixture.componentInstance.select(fixture.componentInstance.cards().find((c) => c.plan.code === 'premium')!);
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    expect(serviceMock.changePlan).not.toHaveBeenCalled();
  });

  it('annulation programmée : le lien du message reprend l\'abonnement et débloque les offres', async () => {
    await create(of(current({ cancelAtPeriodEnd: true })));
    serviceMock.getCurrent.mockReturnValue(of(current()));
    const banner = [...compiled.querySelectorAll('p')].find((p) => p.textContent?.includes('en cours d’annulation'))!;

    click(banner.querySelector('button') as HTMLElement);

    expect(serviceMock.resume).toHaveBeenCalledTimes(1);
    expect(text()).not.toContain('reprenez-le pour changer d’offre');
    expect(planCard('Premium').disabled).toBe(false);
  });

  it('pas de message de reprise quand l\'abonnement n\'est pas annulé', async () => {
    await create();

    expect(text()).not.toContain('en cours d’annulation');
  });

  it('en retard de paiement et annulé, un seul message : celui du paiement', async () => {
    await create(of(current({ status: 'past_due', cancelAtPeriodEnd: true })));

    expect(text()).toContain('Vous pourrez changer d’offre une fois le paiement régularisé');
    expect(text()).not.toContain('reprenez-le pour changer d’offre');
    expect(planCard('Premium').disabled).toBe(true);
  });

  it('hors retard de paiement, les offres restent sélectionnables', async () => {
    await create();

    expect(planCard('Premium').disabled).toBe(false);
    expect(planCard('Essentiel').disabled).toBe(false);
  });

  it('en retard de paiement, l\'annulation ne promet pas un accès qui n\'existe plus', async () => {
    await create(of(current({ status: 'past_due' })));

    click(button('Annuler mon abonnement'));
    expect(text()).toContain('Votre abonnement prendra fin le 1er septembre 2026');
    expect(text()).toContain('Votre accès reste limité tant que le dernier paiement n\'est pas régularisé');
    expect(text()).not.toContain('reste actif');
    click(button('Annuler mon abonnement'));

    expect(serviceMock.cancel).toHaveBeenCalledTimes(1);
    expect(text()).toContain('Annulation enregistrée : votre abonnement prendra fin le 1er septembre 2026. Votre accès reste limité');
  });

  it('au retour de la page de paiement, confirme ou annonce l\'abandon', async () => {
    await create(of(current()), { query: { checkout: 'success' } });
    expect(text()).toContain('Paiement reçu');

    TestBed.resetTestingModule();
    await create(of(current()), { query: { checkout: 'cancelled' } });
    expect(text()).toContain('Paiement annulé');
  });

  it('au retour de la page de paiement, attend que le webhook active l\'abonnement puis recharge tout', async () => {
    await create(of(null), { invoices: [], query: { checkout: 'success' } });
    expect(text()).toContain('Plan Gratuit');
    expect(compiled.querySelector('[role="status"]')?.getAttribute('aria-busy')).toBe('true');

    // 1re relecture : le webhook n'est pas encore passé
    await wait(0);
    expect(text()).toContain('Paiement reçu');
    expect(text()).toContain('Plan Gratuit');

    // 2e relecture : l'abonnement et sa facture existent
    serviceMock.getCurrent.mockReturnValue(of(current()));
    serviceMock.getInvoices.mockReturnValue(of(INVOICES));
    await wait(2000);

    expect(text()).toContain('Votre abonnement est actif.');
    expect(compiled.querySelector('[role="status"]')?.getAttribute('aria-busy')).toBe('false');
    expect(plain(compiled.querySelector('section')!)).toContain('Plan Pro');
    expect(text()).toContain('Carte bancaire •••• 4242');
    expect(compiled.querySelectorAll('section:nth-of-type(2) ul li').length).toBe(2);
  });

  it('au retour de la page de paiement, renonce au bout de 20 secondes et le dit', async () => {
    await create(of(null), { invoices: [], query: { checkout: 'success' } });

    await wait(20000);

    expect(text()).toContain('L’activation prend plus de temps que prévu');
    expect(compiled.querySelector('[role="status"]')?.getAttribute('aria-busy')).toBe('false');
    const calls = serviceMock.getCurrent.mock.calls.length;
    await wait(20000);
    expect(serviceMock.getCurrent.mock.calls.length).toBe(calls);
  });

  it('sans retour de paiement, ne relit rien en boucle', async () => {
    await create();

    await wait(30000);

    expect(serviceMock.getCurrent).toHaveBeenCalledTimes(1);
  });

  it('affiche un message quand le back est injoignable', async () => {
    await create(throwError(() => new Error('API down')));

    expect(text()).toContain('Impossible de charger votre abonnement');
  });
});
