import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { requestTitle, shortDate, unitLabel } from '../../request-format';
import { Quote, RequestsService } from '../requests.service';

type StatusFilter = 'all' | 'sent' | 'accepted';

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'sent', label: 'Envoyés' },
  { id: 'accepted', label: 'Acceptés' },
];

// un badge par statut de reponse (cahier fonctionnel)
const BADGES: Record<string, { label: string; style: string }> = {
  sent: { label: 'Envoyée', style: 'border border-primary text-primary' },
  seen: { label: 'Vue', style: 'border border-grey-400 text-grey-700' },
  accepted: { label: 'Acceptée', style: 'bg-success text-white' },
  declined: { label: 'Refusée', style: 'bg-danger text-white' },
  expired: { label: 'Expirée', style: 'border border-grey-400 text-grey-500' },
  archived: { label: 'Archivée', style: 'border border-grey-400 text-grey-500' },
};

// sans accents ni majuscules, pour la recherche
const plain = (text: string): string => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// page "Mes devis" semblable au figma, branchee sur GET /api/producer/quotes (les reponses envoyees avec un prix).
// Page en lecture seule : les statuts Vue / Acceptee / Refusee / Expiree sont poses cote client (voir NOTES.md,
// section sur les chevauchements avec la section client), ici on ne fait que les afficher. "Envoyes" = statut envoye
// seulement, comme le cahier qui separe "devis envoyes" et "reponses vues". La recherche n'existe qu'en mobile.
@Component({
  selector: 'app-producer-quotes',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './quotes.component.html',
})
export class QuotesComponent {
  // undefined = chargement, null = erreur (back injoignable, compte sans profil producteur...)
  quotes = toSignal(inject(RequestsService).getQuotes().pipe(catchError(() => of(null))));

  readonly filters = FILTERS;
  filter = signal<StatusFilter>('all');
  search = signal('');

  visibleQuotes = computed(() => {
    const term = plain(this.search().trim());
    return (this.quotes() ?? []).filter(
      (q) =>
        (this.filter() === 'all' || q.status === this.filter()) &&
        (!term || plain(`${q.product ?? ''} ${q.clientName}`).includes(term)),
    );
  });

  readonly requestTitle = requestTitle;

  // ex. "12 €/kg", "1,20 €/kg"
  price(quote: Quote): string {
    const amount = Number.isInteger(quote.priceAmount) ? String(quote.priceAmount) : quote.priceAmount.toFixed(2).replace('.', ',');
    return `${amount} ${quote.currency ?? '€'}${quote.priceUnit ? `/${unitLabel({ unit: quote.priceUnit, quantity: null })}` : ''}`;
  }

  // ex. "Camille R. · 12 €/kg · 12 août"
  details(quote: Quote): string {
    return `${quote.clientName} · ${this.price(quote)} · ${shortDate(quote.sentAt)}`;
  }

  badge(quote: Quote): { label: string; style: string } {
    return BADGES[quote.status] ?? { label: quote.status, style: 'border border-grey-400 text-grey-700' };
  }
}
