import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, map, of, switchMap } from 'rxjs';
import { longDate } from '../request-format';
import { formatMoney, formatPrice } from './subscription-format';
import { BillingCycle, CurrentSubscription, Invoice, Plan, PlanPrice, SubscriptionService } from './subscription.service';

// un abonnement qui donne encore acces (un annule ou expire = retour a l'offre gratuite)
const IN_FORCE = ['active', 'trialing', 'past_due'];

interface PlanCard {
  plan: Plan;
  price: PlanPrice;
  isCurrent: boolean;
  // economie de l'annuel par rapport a 12 mensualites, en % (null si inconnue ou nulle)
  saving: number | null;
}

// page "Mon abonnement" semblable au figma, branchee sur /api/subscription/* (plans, current, invoices, checkout,
// change-plan, cancel) et sur les cartes (/payment-methods) pour la ligne "Carte bancaire". Les offres et leurs prix
// viennent de l'admin, rien n'est ecrit en dur. Sans abonnement on choisit une offre et on passe par la page de paiement
// Stripe ; avec un abonnement, monter d'offre est immediat et descendre prend effet a la prochaine echeance (cahier
// fonctionnel, regles d'acces). Le bouton "Parametres" de la maquette n'est pas affiche : la page n'existe pas encore.
@Component({
  selector: 'app-producer-subscription',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './subscription.component.html',
})
export class SubscriptionComponent {
  private service = inject(SubscriptionService);
  private refresh = new BehaviorSubject<void>(undefined);
  private checkoutResult = inject(ActivatedRoute).snapshot.queryParamMap.get('checkout');

  // undefined = chargement, null = pas d'abonnement, 'error' = back injoignable
  current = toSignal(
    this.refresh.pipe(switchMap(() => this.service.getCurrent().pipe(catchError(() => of('error' as const))))),
  );
  plans = toSignal(this.service.getPlans().pipe(catchError(() => of([] as Plan[]))), { initialValue: [] as Plan[] });
  invoices = toSignal(this.service.getInvoices().pipe(catchError(() => of([]))), { initialValue: [] });
  // la carte par defaut ; null si on ne peut pas la lire (pas de Stripe, pas d'abonnement...)
  card = toSignal(
    this.service.getCards().pipe(
      map((cards) => cards.find((c) => c.isDefault) ?? cards[0] ?? null),
      catchError(() => of(null)),
    ),
  );

  subscription = computed<CurrentSubscription | null>(() => {
    const current = this.current();
    return current && current !== 'error' && IN_FORCE.includes(current.status) ? current : null;
  });
  private chosenCycle = signal<BillingCycle | null>(null);
  cycle = computed<BillingCycle>(() => this.chosenCycle() ?? this.subscription()?.billingCycle ?? 'monthly');

  pending = signal<PlanCard | null>(null);
  confirmingCancel = signal(false);
  busy = signal(false);
  notice = signal(
    this.checkoutResult === 'success'
      ? "Paiement reçu. Votre abonnement s'active dans quelques instants."
      : this.checkoutResult === 'cancelled'
        ? 'Paiement annulé : votre abonnement n’a pas changé.'
        : '',
  );
  error = signal('');

  cards = computed<PlanCard[]>(() => {
    const currentId = this.subscription()?.planPriceId;
    return this.plans().flatMap((plan) => {
      const price = plan.prices.find((p) => p.billingCycle === this.cycle());
      if (!price) return [];
      const monthly = plan.prices.find((p) => p.billingCycle === 'monthly');
      const saving =
        price.billingCycle === 'yearly' && monthly && Number(monthly.amount) > 0
          ? Math.round((1 - Number(price.amount) / (Number(monthly.amount) * 12)) * 100)
          : null;
      return [{ plan, price, isCurrent: price.id === currentId, saving: saving && saving > 0 ? saving : null }];
    });
  });

  // une offre plus haut dans la liste (ordre de l'admin, le meme que celui du back) est une montee
  pendingIsDowngrade = computed(() => {
    const pending = this.pending();
    const subscription = this.subscription();
    if (!pending || !subscription) return false;
    const order = this.plans().map((p) => p.code);
    return order.indexOf(pending.plan.code) < order.indexOf(subscription.planCode);
  });

  planName = computed(() => this.subscription()?.planName ?? 'Gratuit');

  headline = computed(() => {
    const s = this.subscription();
    return s ? formatPrice(s.amount, s.currencyCode, s.billingCycle) : formatMoney('0', 'EUR');
  });

  // ex. "Renouvellement le 1er septembre 2026 · 24/30 demandes utilisées"
  summary = computed(() => {
    const s = this.subscription();
    if (!s) return 'Profil limité, aperçu anonymisé des demandes.';
    const end = s.cancelAtPeriodEnd ? 'Fin de l’abonnement le' : 'Renouvellement le';
    const usage =
      s.requestsQuota === null
        ? `${s.requestsThisMonth} demandes reçues ce mois-ci`
        : `${s.requestsThisMonth}/${s.requestsQuota} demandes utilisées`;
    return `${end} ${longDate(s.currentPeriodEnd)} · ${usage}`;
  });

  badge = computed(() => {
    const s = this.subscription();
    if (!s) return null;
    if (s.cancelAtPeriodEnd) return 'Annulation prévue';
    return { active: 'Actif', trialing: 'Essai', past_due: 'Paiement en retard' }[s.status as string] ?? null;
  });

  // une facture payee n'a pas de mention ; les autres disent ou en est le paiement
  invoiceStatus(invoice: Invoice): string | null {
    return { failed: 'Paiement échoué', open: 'En attente' }[invoice.status] ?? null;
  }

  readonly longDate = longDate;
  readonly formatMoney = formatMoney;
  readonly formatPrice = formatPrice;

  chooseCycle(cycle: BillingCycle): void {
    this.chosenCycle.set(cycle);
    this.pending.set(null);
  }

  select(card: PlanCard): void {
    if (card.isCurrent) return;
    this.error.set('');
    this.notice.set('');
    this.pending.set(card);
  }

  // sans abonnement : page de paiement Stripe ; avec : changement d'offre
  confirm(): void {
    const pending = this.pending();
    if (!pending) return;

    this.start();
    if (!this.subscription()) {
      this.service.checkout(pending.price.id).subscribe({
        next: ({ checkoutUrl }) => this.redirect(checkoutUrl),
        error: (err) => this.fail(err),
      });
      return;
    }

    this.service.changePlan(pending.price.id).subscribe({
      next: (change) => {
        this.busy.set(false);
        this.pending.set(null);
        this.notice.set(
          change.effect === 'next_renewal' && change.effectiveAt
            ? `Votre plan passera à ${pending.plan.name} le ${longDate(change.effectiveAt)}.`
            : `Votre passage au plan ${pending.plan.name} est en cours : il prend effet immédiatement.`,
        );
        this.refresh.next();
      },
      error: (err) => this.fail(err),
    });
  }

  cancel(): void {
    this.start();
    this.service.cancel().subscribe({
      next: () => {
        this.busy.set(false);
        this.confirmingCancel.set(false);
        this.notice.set('Annulation enregistrée : votre abonnement reste actif jusqu’à la fin de la période payée.');
        this.refresh.next();
      },
      error: (err) => this.fail(err),
    });
  }

  // separe pour pouvoir le remplacer dans les tests (le navigateur quitte la page)
  protected redirect(url: string): void {
    window.location.href = url;
  }

  private start(): void {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
  }

  private fail(err: HttpErrorResponse): void {
    this.busy.set(false);
    this.error.set(err.error?.error ?? 'Action impossible pour le moment.');
  }
}
