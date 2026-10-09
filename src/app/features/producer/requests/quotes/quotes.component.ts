import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { requestTitle, shortDate } from '../../request-format';
import { Quote, RequestsService } from '../requests.service';
import { formatPrice, quoteBadge } from './quote-format';

type StatusFilter = 'all' | 'sent' | 'accepted';

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'sent', label: 'Envoyés' },
  { id: 'accepted', label: 'Acceptés' },
];

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

  // ex. "Camille R. · 12 €/kg · 12 août"
  details(quote: Quote): string {
    return `${quote.clientName} · ${formatPrice(quote.priceAmount, quote.currency, quote.priceUnit)} · ${shortDate(quote.sentAt)}`;
  }

  badge(quote: Quote): { label: string; style: string } {
    return quoteBadge(quote.status);
  }
}
