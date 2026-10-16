import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { FaqArticle } from '../home/faq.model';
import { FaqService } from '../home/faq.service';
import { Plan, SubscriptionService } from '../producer/subscription/subscription.service';
import { PricingComponent } from './pricing.component';

const plan = (
  code: string,
  name: string,
  monthly: number | null,
  yearly: number | null,
  features: Record<string, unknown> | null,
  limits: Record<string, unknown> | null,
  description: string | null = null,
): Plan => ({
  id: code,
  code,
  name,
  description,
  features,
  limits,
  prices: [
    ...(monthly !== null ? [{ id: `${code}-m`, billingCycle: 'monthly' as const, amount: `${monthly}.00`, currencyCode: 'EUR' }] : []),
    ...(yearly !== null ? [{ id: `${code}-y`, billingCycle: 'yearly' as const, amount: `${yearly}.00`, currencyCode: 'EUR' }] : []),
  ],
});

const PLANS: Plan[] = [
  plan('standard', 'Standard', 19, 190, { reply_to_requests: true, max_products: 20, recommended: true }, { requests_per_month: 30 }, 'Accès aux demandes clients et à la messagerie.'),
  plan('premium', 'Premium', 49, 490, { reply_to_requests: true, max_products: null, featured: true }, null, 'Accès illimité, mise en avant dans les résultats de recherche.'),
];

const FAQ: FaqArticle[] = [
  { id: 'a1', category: 'Abonnement', question: 'Que débloque l\'abonnement ?', answer: 'Les demandes en entier.' },
  { id: 'a2', category: 'Abonnement', question: 'Comment annuler ?', answer: 'Depuis Mon abonnement.' },
  { id: 'c1', category: 'Clients', question: 'Est-ce gratuit ?', answer: 'Oui, pour les clients.' },
];

describe('PricingComponent', () => {
  let fixture: ComponentFixture<PricingComponent>;
  let compiled: HTMLElement;

  async function create(
    options: { plans$?: Observable<Plan[]>; faq$?: Observable<FaqArticle[]>; roles?: string[] | null } = {},
  ): Promise<void> {
    const roles = options.roles ?? null;
    await TestBed.configureTestingModule({
      imports: [PricingComponent],
      providers: [
        provideRouter([]),
        { provide: SubscriptionService, useValue: { getPlans: vi.fn(() => options.plans$ ?? of(PLANS)) } },
        { provide: FaqService, useValue: { getAll: vi.fn(() => options.faq$ ?? of(FAQ)) } },
        { provide: AuthService, useValue: { currentUser: signal(roles ? { id: 'u1', email: 'a@b.c', firstName: 'A', lastName: 'B', roles } : null) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = () => compiled.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const plain = (element: Element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const button = (label: string) => [...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
  const links = (label: string) => [...compiled.querySelectorAll('a')].filter((a) => a.textContent?.trim() === label);
  const card = (name: string) => [...compiled.querySelectorAll('article')].find((a) => a.querySelector('h3')?.textContent?.trim() === name)!;
  const click = (element: HTMLElement) => {
    element.click();
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  // semblable au figma : fil d'Ariane, titre, bascule, trois cartes
  it('montre le fil d\'Ariane, le titre et les offres de la base avec leur prix mensuel', async () => {
    await create();

    expect(plain(compiled.querySelector('nav')!)).toBe('Accueil / Forfaits');
    expect(compiled.querySelector('nav a')?.getAttribute('href')).toBe('/');
    expect(compiled.querySelector('h1')?.textContent).toContain('Des forfaits simples, sans commission');
    expect(text()).toContain('jamais de commission sur vos ventes');
    expect(text()).toContain('déposer une demande reste gratuit');
    expect(plain(card('Standard'))).toContain('19 €/mois');
    expect(plain(card('Premium'))).toContain('49 €/mois');
    expect(compiled.querySelectorAll('article').length).toBe(2);
  });

  it('dit en une phrase ce que garde un producteur sans abonnement, sans carte « Gratuit »', async () => {
    await create();

    expect(text()).toContain('Sans abonnement, vous gardez gratuitement un profil limité, un aperçu anonymisé des demandes et une visibilité basique.');
    expect([...compiled.querySelectorAll('article h3')].map((h) => h.textContent?.trim())).not.toContain('Gratuit');
  });

  it('met en avant l\'offre recommandée : carte verte, badge et bouton doré', async () => {
    await create();

    const recommended = card('Standard');
    expect(plain(recommended)).toContain('Recommandé');
    expect(recommended.className).toContain('bg-badge-bg');
    expect(recommended.querySelector('a')!.className).toContain('bg-gold-wheat');
    // les autres restent des cartes blanches avec le bouton vert
    expect(plain(card('Premium'))).not.toContain('Recommandé');
    expect(card('Premium').className).toContain('bg-white');
    expect(card('Premium').querySelector('a')!.className).toContain('bg-agri');
  });

  it('sans offre marquée recommandée, aucun badge', async () => {
    await create({ plans$: of(PLANS.map((p) => ({ ...p, features: { ...p.features, recommended: false } }))) });

    expect(text()).not.toContain('Recommandé');
  });

  it('dit les droits et les limites de chaque offre, ce qu\'elle contient et rien de plus', async () => {
    await create();

    expect(plain(card('Standard'))).toContain('Demandes en entier et réponses aux clients');
    expect(plain(card('Standard'))).toContain('30 demandes par mois');
    expect(plain(card('Standard'))).toContain('Jusqu\'à 20 produits');
    expect(plain(card('Standard'))).not.toContain('Mise en avant');
    // pas de quota ni de limite de produits dans la base = illimité
    expect(plain(card('Premium'))).toContain('Demandes illimitées');
    expect(plain(card('Premium'))).toContain('Produits illimités');
    expect(plain(card('Premium'))).toContain('Mise en avant dans les résultats');
  });

  it('écrit le chat, les statistiques et le support prioritaire des offres plus hautes', async () => {
    await create({
      plans$: of([
        plan('pro', 'Pro', 24, 240, { reply_to_requests: true, chat: true, stats: 'basic' }, { requests_per_month: 60 }),
        plan('max', 'Max', 49, 490, { reply_to_requests: true, featured: true, stats: 'advanced', priority_support: true }, null),
      ]),
    });

    expect(plain(card('Pro'))).toContain('Chat en direct avec les clients');
    expect(plain(card('Pro'))).toContain('Statistiques de base');
    expect(plain(card('Pro'))).not.toContain('Statistiques avancées');
    expect(plain(card('Max'))).toContain('Statistiques avancées');
    expect(plain(card('Max'))).toContain('Support prioritaire');
    expect(plain(card('Max'))).not.toContain('Chat en direct');
  });

  it('n\'écrit pas le nom technique d\'un droit inconnu, ni de quota pour une offre qui ne permet pas de répondre', async () => {
    await create({
      plans$: of([plan('vitrine', 'Vitrine', 5, 50, { reply_to_requests: false, mystery_flag: true, stats: 'other' }, { requests_per_month: 10 })]),
    });

    expect(text()).not.toContain('mystery_flag');
    expect(text()).not.toContain('other');
    expect(plain(card('Vitrine'))).not.toContain('demandes par mois');
    expect(plain(card('Vitrine'))).not.toContain('Demandes illimitées');
    // aucune limite de produits dans la base pour cette offre : rien à dire (ni « illimités », ni un nombre)
    expect(plain(card('Vitrine')).toLowerCase()).not.toContain('produits');
  });

  it('la bascule annonce l\'économie de l\'annuel, la plus forte des offres', async () => {
    await create();
    // 12 mensualités de 19 € = 228 € : 190 € est 17 % moins cher (idem 490 € contre 588 €)
    expect(button('Annuel (-17 %)')).toBeTruthy();

    TestBed.resetTestingModule();
    await create({ plans$: of([plan('a', 'A', 10, 100, null, null), plan('b', 'B', 20, 192, null, null)]) });
    // 100 € contre 120 € = 17 %, 192 € contre 240 € = 20 % : on annonce 20
    expect(button('Annuel (-20 %)')).toBeTruthy();

    TestBed.resetTestingModule();
    await create({ plans$: of([plan('c', 'C', 10, 120, null, null)]) });
    expect(button('Annuel')).toBeTruthy();
  });

  it('en annuel : prix à l\'année, équivalent par mois, et l\'engagement dit dans les conditions', async () => {
    await create();

    click(button('Annuel (-17 %)'));

    expect(button('Annuel (-17 %)').getAttribute('aria-pressed')).toBe('true');
    expect(button('Mensuel').getAttribute('aria-pressed')).toBe('false');
    expect(plain(card('Standard'))).toContain('190 €/an');
    expect(plain(card('Standard'))).toContain('soit 15,83 € par mois');
    expect(plain(card('Premium'))).toContain('490 €/an');
    expect(plain(card('Premium'))).toContain('soit 40,83 € par mois');
    expect(plain(compiled.querySelector('[aria-labelledby="conditions-title"]')!)).toContain('Engagement de 12 mois');
  });

  it('en mensuel, pas d\'équivalent par mois', async () => {
    await create();

    expect(text()).not.toContain('par mois soit');
    expect(plain(card('Standard'))).not.toContain('soit');
  });

  it('une offre sans prix annuel n\'est pas proposée en annuel', async () => {
    await create({ plans$: of([...PLANS, plan('mensuel-seul', 'Mensuel seul', 9, null, { reply_to_requests: true }, null)]) });
    expect(card('Mensuel seul')).toBeTruthy();

    click(button('Annuel (-17 %)'));

    expect(compiled.querySelectorAll('article').length).toBe(2);
    expect([...compiled.querySelectorAll('article h3')].map((h) => h.textContent?.trim())).not.toContain('Mensuel seul');
  });

  it('pour un visiteur, chaque « Choisir ce forfait » mène à la création d\'un profil producteur', async () => {
    await create();

    const choose = links('Choisir ce forfait');
    expect(choose.length).toBe(2);
    for (const a of choose) {
      expect(a.getAttribute('href')).toBe('/auth/register?role=producer');
    }
  });

  it('pour un producteur connecté, « Choisir ce forfait » mène à son abonnement', async () => {
    await create({ roles: ['ROLE_PRODUCER'] });

    const choose = links('Choisir ce forfait');
    expect(choose.length).toBe(2);
    for (const a of choose) {
      expect(a.getAttribute('href')).toBe('/producer/subscription');
    }
  });

  it('donne le ROI du cahier, sans chiffre inventé ni exemple de demande', async () => {
    await create();

    expect(plain(compiled.querySelector('[aria-labelledby="value-title"]')!)).toContain("Ce que vous apporte l'abonnement");
    expect(text()).not.toContain('Exemple fictif');
    expect(text()).toContain('Des demandes qualifiées');
    expect(text()).toContain('De la visibilité locale');
    expect(text()).toContain('Du temps gagné');
    expect(text()).toContain('Des conversations directes');
    expect(text()).toContain('Aucune commission sur vos ventes');
  });

  it('écrit les conditions des cahiers avant de payer, et rien de plus : engagement, changement d\'offre, annulation, factures', async () => {
    await create();

    const section = compiled.querySelector('[aria-labelledby="conditions-title"]')!;
    expect([...section.querySelectorAll('dt')].map((dt) => dt.textContent?.trim())).toEqual([
      'Mensuel',
      'Annuel',
      "Changer d'offre",
      'Renouvellement et factures',
    ]);
    const conditions = plain(section);
    expect(conditions).toContain('Sans engagement');
    expect(conditions).toContain('Engagement de 12 mois');
    expect(conditions).toContain('sans remboursement');
    expect(conditions).toContain('Une offre plus haute prend effet tout de suite');
    expect(conditions).toContain('prend effet à la prochaine échéance');
    expect(conditions).toContain('chaque facture, téléchargeable');
  });

  it('si les offres ne se chargent pas, le dit mais garde le reste de la page', async () => {
    await create({ plans$: throwError(() => new Error('down')) });

    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Impossible de charger les offres');
    expect(text()).toContain('Sans abonnement, vous gardez gratuitement');
    expect(text()).toContain('Les conditions, sans surprise');
  });

  it('pendant le chargement, le dit', async () => {
    await create({ plans$: NEVER });

    expect(text()).toContain('Chargement des offres');
  });

  it('sans offre pour la durée choisie, le dit', async () => {
    await create({ plans$: of([]) });

    expect(text()).toContain('Aucune offre mensuelle pour le moment.');
    click(button('Annuel'));
    expect(text()).toContain('Aucune offre annuelle pour le moment.');
  });

  it('la FAQ ne reprend que les questions de la catégorie Abonnement, une seule ouverte à la fois', async () => {
    await create();

    const faq = compiled.querySelector('[aria-labelledby="faq-title"]')!;
    const questions = [...faq.querySelectorAll('button')];
    expect(questions.map((b) => b.textContent?.trim())).toEqual(['Que débloque l\'abonnement ?', 'Comment annuler ?']);
    expect(plain(faq)).not.toContain('Est-ce gratuit ?');
    // tout est fermé au départ
    expect(questions.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(plain(faq)).not.toContain('Les demandes en entier.');

    click(questions[0]);
    expect(questions[0].getAttribute('aria-expanded')).toBe('true');
    expect(plain(faq)).toContain('Les demandes en entier.');

    click(questions[1]);
    expect(questions[0].getAttribute('aria-expanded')).toBe('false');
    expect(plain(faq)).toContain('Depuis Mon abonnement.');
    expect(plain(faq)).not.toContain('Les demandes en entier.');

    click(questions[1]);
    expect(questions[1].getAttribute('aria-expanded')).toBe('false');
  });

  it('sans question « Abonnement » ou si la FAQ ne se charge pas, pas de bloc FAQ', async () => {
    await create({ faq$: of(FAQ.filter((a) => a.category !== 'Abonnement')) });
    expect(compiled.querySelector('[aria-labelledby="faq-title"]')).toBeNull();

    TestBed.resetTestingModule();
    await create({ faq$: throwError(() => new Error('down')) });
    expect(compiled.querySelector('[aria-labelledby="faq-title"]')).toBeNull();
  });
});
