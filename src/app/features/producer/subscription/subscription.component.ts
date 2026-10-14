import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, first, forkJoin, map, of, switchMap, take, timer } from 'rxjs';
import { longDate } from '../request-format';
import { formatMoney, formatPrice } from './subscription-format';
import { BillingCycle, CurrentSubscription, Invoice, Plan, PlanPrice, ScheduledChange, SubscriptionService } from './subscription.service';

// un abonnement qui donne encore acces (un annule ou expire = retour a l'offre gratuite)
const IN_FORCE = ['active', 'trialing', 'past_due'];

// le webhook de Stripe qui active l'abonnement arrive apres la page : on la relit toutes les 2 s pendant 20 s au plus
const POLL_EVERY_MS = 2000;
const POLL_TRIES = 10;
const TOO_SLOW = 'L’activation prend plus de temps que prévu : rechargez la page dans un instant.';

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
  private destroyRef = inject(DestroyRef);
  private refresh = new BehaviorSubject<void>(undefined);
  private checkoutResult = inject(ActivatedRoute).snapshot.queryParamMap.get('checkout');

  // undefined = chargement, null = pas d'abonnement, 'error' = back injoignable
  current = toSignal(
    this.refresh.pipe(switchMap(() => this.service.getCurrent().pipe(catchError(() => of('error' as const))))),
  );
  plans = toSignal(this.service.getPlans().pipe(catchError(() => of([] as Plan[]))), { initialValue: [] as Plan[] });
  // factures, carte et changement programme se relisent avec l'abonnement (apres un paiement, un changement, une reprise)
  invoices = toSignal(this.refresh.pipe(switchMap(() => this.service.getInvoices().pipe(catchError(() => of([] as Invoice[]))))), {
    initialValue: [] as Invoice[],
  });
  // la carte par defaut ; null si on ne peut pas la lire (pas de Stripe, pas d'abonnement...)
  card = toSignal(
    this.refresh.pipe(
      switchMap(() =>
        this.service.getCards().pipe(
          map((cards) => cards.find((c) => c.isDefault) ?? cards[0] ?? null),
          catchError(() => of(null)),
        ),
      ),
    ),
  );
  // la descente deja programmée (Stripe la garde, pas la base) null s'il n'y en a pas ou si on ne peut pas la lire
  scheduledChange = toSignal(this.refresh.pipe(switchMap(() => this.service.getScheduledChange().pipe(catchError(() => of(null))))), {
    initialValue: null as ScheduledChange | null,
  });

  subscription = computed<CurrentSubscription | null>(() => {
    const current = this.current();
    return current && current !== 'error' && IN_FORCE.includes(current.status) ? current : null;
  });
  private chosenCycle = signal<BillingCycle | null>(null);
  cycle = computed<BillingCycle>(() => this.chosenCycle() ?? this.subscription()?.billingCycle ?? 'monthly');

  pending = signal<PlanCard | null>(null);
  confirmingCancel = signal(false);
  busy = signal(false);
  // on attend que le webhook de Stripe ait mis la base a jour
  waiting = signal(false);
  notice = signal(
    this.checkoutResult === 'success'
      ? "Paiement reçu. Votre abonnement s'active dans quelques instants."
      : this.checkoutResult === 'cancelled'
        ? 'Paiement annulé : votre abonnement n’a pas changé.'
        : '',
  );
  error = signal('');

  constructor() {
    // de retour de la page de paiement : l'abonnement et sa facture peuvent ne pas encore etre la
    if (this.checkoutResult === 'success') {
      this.watch((current, invoices) => !!current && IN_FORCE.includes(current.status) && invoices.length > 0, 'Votre abonnement est actif.');
    }
  }

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
        if (change.effect === 'next_renewal' && change.effectiveAt) {
          this.notice.set(`Votre plan passera à ${pending.plan.name} le ${longDate(change.effectiveAt)}.`);
          this.refresh.next();
          return;
        }
        // montee d'offre : Stripe l'applique tout de suite, la base suit par webhook
        this.notice.set(`Votre passage au plan ${pending.plan.name} est en cours : il prend effet immédiatement.`);
        this.watch((current) => current?.planPriceId === pending.price.id, `Votre plan est maintenant ${pending.plan.name}.`);
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

  // abonnement dont l'annulation etait programmee : il continue et se renouvelle
  resume(): void {
    const end = this.subscription()!.currentPeriodEnd;
    this.start();
    this.service.resume().subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.set(`Votre abonnement est repris : il se renouvellera le ${longDate(end)}.`);
        this.refresh.next();
      },
      error: (err) => this.fail(err),
    });
  }

  // relit l'abonnement et les factures jusqu'a ce que `done` soit vrai, puis recharge toute la page, sinon dit que c'est long
  private watch(done: (current: CurrentSubscription | null, invoices: Invoice[]) => boolean, success: string): void {
    this.waiting.set(true);
    timer(0, POLL_EVERY_MS)
      .pipe(
        take(POLL_TRIES),
        switchMap(() =>
          forkJoin({
            current: this.service.getCurrent().pipe(catchError(() => of(null))),
            invoices: this.service.getInvoices().pipe(catchError(() => of([] as Invoice[]))),
          }),
        ),
        first(({ current, invoices }) => done(current, invoices), null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((found) => {
        this.waiting.set(false);
        this.notice.set(found ? success : TOO_SLOW);
        this.refresh.next();
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
