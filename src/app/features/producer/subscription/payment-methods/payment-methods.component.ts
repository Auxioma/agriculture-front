import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { cardBrand } from '../subscription-format';
import { PaymentCard, SubscriptionService } from '../subscription.service';

// page "Moyens de paiement" semblable au figma, branchee sur /api/subscription/payment-methods. Les cartes sont lues
// chez Stripe a chaque ouverture (rien n'est stocke chez nous) ; "Ajouter une carte" envoie sur une page Stripe qui
// ramene ici (?card=added). La carte par defaut ne se supprime pas : on en choisit d'abord une autre.
@Component({
  selector: 'app-producer-payment-methods',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './payment-methods.component.html',
})
export class PaymentMethodsComponent {
  private service = inject(SubscriptionService);
  private result = inject(ActivatedRoute).snapshot.queryParamMap.get('card');

  // undefined = chargement, null = impossible de les lire (voir loadError)
  cards = signal<PaymentCard[] | null | undefined>(undefined);
  loadError = signal('');
  busy = signal(false);
  confirmingId = signal('');
  error = signal('');
  notice = signal(this.result === 'added' ? 'Carte ajoutée.' : this.result === 'cancelled' ? 'Ajout de la carte annulé.' : '');

  readonly brand = cardBrand;

  constructor() {
    this.load();
  }

  // ex. "Expire 08/2028"
  expiry(card: PaymentCard): string | null {
    return card.expMonth && card.expYear ? `Expire ${String(card.expMonth).padStart(2, '0')}/${card.expYear}` : null;
  }

  makeDefault(card: PaymentCard): void {
    this.run(this.service.makeCardDefault(card.id), 'Carte par défaut mise à jour.');
  }

  remove(card: PaymentCard): void {
    this.confirmingId.set('');
    this.run(this.service.deleteCard(card.id), 'Carte supprimée.');
  }

  add(): void {
    this.busy.set(true);
    this.error.set('');
    this.service.addCard().subscribe({
      next: ({ setupUrl }) => this.redirect(setupUrl),
      error: (err: HttpErrorResponse) => this.fail(err),
    });
  }

  // separe pour pouvoir le remplacer dans les tests (le navigateur quitte la page)
  protected redirect(url: string): void {
    window.location.href = url;
  }

  private load(): void {
    this.service.getCards().subscribe({
      next: (cards) => this.cards.set(cards),
      error: (err: HttpErrorResponse) => {
        this.cards.set(null);
        this.loadError.set(err.error?.error ?? 'Impossible de charger vos cartes pour le moment.');
      },
    });
  }

  private run(call: Observable<unknown>, done: string): void {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.set(done);
        this.load();
      },
      error: (err: HttpErrorResponse) => this.fail(err),
    });
  }

  private fail(err: HttpErrorResponse): void {
    this.busy.set(false);
    this.error.set(err.error?.error ?? 'Action impossible pour le moment.');
  }
}
