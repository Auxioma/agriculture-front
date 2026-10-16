import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { FaqService } from '../home/faq.service';
import { FaqArticle } from '../home/faq.model';
import { hasProducerRole } from '../producer/producer-role';
import { annualSaving, formatMoney } from '../producer/subscription/subscription-format';
import { BillingCycle, Plan, PlanPrice, SubscriptionService } from '../producer/subscription/subscription.service';

interface PlanCard {
  plan: Plan;
  price: PlanPrice;
  // l'annuel ramene au mois, pour comparer avec le mensuel
  perMonth: string | null;
  points: string[];
  // l'offre mise en avant (carte verte, badge « Recommande », bouton dore), comme le figma
  recommended: boolean;
}

// la FAQ de cette page = les articles de la categorie "Abonnement" (cahier graphisme : "une FAQ sur l'abonnement"),
// a modifier dans l'admin avec le reste de la FAQ
const FAQ_CATEGORY = 'Abonnement';

// ce que dit une offre, d'apres ses droits et ses limites. Ils sont configures en base (features / limits, hors formulaire
// de l'admin) et seules les cles qu'on connait sont ecrites : une cle inconnue n'afficherait que son nom technique.
//   reply_to_requests (bool), requests_per_month (limits, absent = illimite), max_products (nombre ou null = illimite),
//   chat (bool), stats ('basic' | 'advanced'), featured (bool), priority_support (bool) ; recommended (bool) n'est pas un droit
const STATS: Record<string, string> = { basic: 'Statistiques de base', advanced: 'Statistiques avancées' };

function planPoints(plan: Plan): string[] {
  const features = plan.features ?? {};
  const limits = plan.limits ?? {};
  const points: string[] = [];

  if (features['reply_to_requests']) {
    points.push('Demandes en entier et réponses aux clients');
    const quota = limits['requests_per_month'];
    points.push(typeof quota === 'number' ? `${quota} demandes par mois` : 'Demandes illimitées');
  }
  if ('max_products' in features) {
    const max = features['max_products'];
    points.push(typeof max === 'number' ? `Jusqu'à ${max} produits` : 'Produits illimités');
  }
  if (features['chat']) points.push('Chat en direct avec les clients');
  const stats = STATS[String(features['stats'])];
  if (stats) points.push(stats);
  if (features['featured']) points.push('Mise en avant dans les résultats');
  if (features['priority_support']) points.push('Support prioritaire');

  return points;
}

// page publique « Forfaits » (« Tarif producteurs » dans la barre de navigation) semblable au figma : fil d'Ariane, titre,
// bascule mensuel / annuel (avec l'economie), puis les offres, dont une recommandee. Branchee sur GET /api/subscription/plans :
// les offres et leurs prix viennent de la base, rien n'est ecrit en dur. Sous les offres, ce que les cahiers demandent en plus
// de la maquette : preuve de valeur (la meme demande vue sans puis avec abonnement), conditions et FAQ sur l'abonnement.
// Le client ne paie rien et il n'y a aucune commission sur les ventes (cahier fonctionnel, "Ce que la plateforme ne fait pas").
@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './pricing.component.html',
})
export class PricingComponent {
  private auth = inject(AuthService);

  // undefined = chargement, null = erreur (back injoignable)
  plans = toSignal(inject(SubscriptionService).getPlans().pipe(catchError(() => of(null))));
  faq = toSignal(
    inject(FaqService)
      .getAll()
      .pipe(
        map((articles) => articles.filter((a) => a.category === FAQ_CATEGORY)),
        catchError(() => of([] as FaqArticle[])),
      ),
    { initialValue: [] as FaqArticle[] },
  );

  cycle = signal<BillingCycle>('monthly');
  private openFaqId = signal('');

  // un producteur connecte va gerer son abonnement ; les autres creent leur profil producteur
  isProducer = computed(() => hasProducerRole(this.auth.currentUser()?.roles ?? []));

  // « Annuel (-17 %) » : la plus forte economie de l'annuel parmi les offres (null s'il n'y en a pas)
  annualSaving = computed(() => {
    const savings = (this.plans() ?? []).map((plan) =>
      annualSaving(
        plan.prices.find((p) => p.billingCycle === 'monthly')?.amount ?? null,
        plan.prices.find((p) => p.billingCycle === 'yearly')?.amount ?? null,
      ),
    );
    return Math.max(0, ...savings.map((s) => s ?? 0)) || null;
  });

  cards = computed<PlanCard[]>(() =>
    (this.plans() ?? []).flatMap((plan) => {
      const price = plan.prices.find((p) => p.billingCycle === this.cycle());
      if (!price) return [];
      return [
        {
          plan,
          price,
          points: planPoints(plan),
          recommended: plan.features?.['recommended'] === true,
          perMonth:
            price.billingCycle === 'yearly' && Number(price.amount) > 0
              ? formatMoney(String(Number(price.amount) / 12), price.currencyCode)
              : null,
        },
      ];
    }),
  );

  // la preuve de valeur du cahier (fonctionnel, "Abonnements producteurs") : pas de chiffres inventes
  readonly values = [
    'Des demandes qualifiées, proches de chez vous et adaptées à vos produits',
    'De la visibilité locale auprès de particuliers et de professionnels',
    'Du temps gagné : vous répondez quand vous êtes disponible, même depuis votre téléphone',
    'Des conversations directes avec vos clients, sans intermédiaire',
    'Aucune commission sur vos ventes',
  ];

  // les memes regles que la page "Mon abonnement" et la FAQ (cahier : prix, renouvellement, annulation, facture, upgrade et downgrade)
  readonly conditions = [
    {
      term: 'Mensuel',
      text: "Sans engagement. Vous annulez quand vous voulez : l'accès reste actif jusqu'à la fin de la période déjà payée, puis vous repassez à l'offre gratuite.",
    },
    {
      term: 'Annuel',
      text: "Engagement de 12 mois, avec une économie sur chaque offre. L'annulation prend effet à la fin de l'engagement, sans remboursement.",
    },
    {
      term: "Changer d'offre",
      text: "Une offre plus haute prend effet tout de suite : seule la différence, au prorata de la période en cours, est facturée. Une offre plus basse prend effet à la prochaine échéance. Sous engagement annuel, le passage au mensuel attend la fin de l'engagement.",
    },
    {
      term: 'Paiement et factures',
      text: 'Le paiement passe par Stripe : nous ne stockons aucune donnée de carte. Le renouvellement, la date du prochain paiement et chaque facture, téléchargeable, sont dans votre espace « Mon abonnement ».',
    },
    {
      term: 'Paiement refusé',
      text: "Vous êtes prévenu et Stripe réessaie. En attendant, votre accès aux demandes complètes et aux réponses est limité jusqu'à régularisation.",
    },
  ];

  isFaqOpen(id: string): boolean {
    return this.openFaqId() === id;
  }

  toggleFaq(id: string): void {
    this.openFaqId.update((open) => (open === id ? '' : id));
  }

  readonly formatMoney = formatMoney;
}
