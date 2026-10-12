import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { requestTitle, shortDate } from '../../request-format';
import { Quote, RequestsService } from '../requests.service';
import { formatPrice, quoteBadge } from './quote-format';

type StatusFilter = 'all' | 'sent' | 'seen' | 'accepted' | 'draft' | 'archived';

// "Tous" = l'historique ; les autres puces reprennent les vues du cahier (devis envoyes, reponses vues, brouillons,
// archives) et l'accepte de la maquette
const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'sent', label: 'Envoyés' },
  { id: 'seen', label: 'Vus' },
  { id: 'accepted', label: 'Acceptés' },
  { id: 'draft', label: 'Brouillons' },
  { id: 'archived', label: 'Archivés' },
];

// sans accents ni majuscules, pour la recherche
const plain = (text: string): string => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// page "Mes devis" semblable au figma, branchee sur GET /api/producer/quotes (toutes les reponses du producteur, avec ou
// sans prix, brouillons compris : le cahier parle de "Mes reponses"). Page en lecture seule : les statuts Vue /
// Acceptee / Refusee / Expiree / Archivee sont poses cote client (voir NOTES.md, section sur les chevauchements avec
// la section client), ici on ne fait que les afficher. "Envoyes" = statut envoye seulement, comme le cahier qui
// separe "devis envoyes" et "reponses vues". Un brouillon se rouvre dans la page de reponse, pas dans le detail.

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

  // ex. "Camille R. · 12 €/kg · 12 août" (sans le prix pour une reponse sans devis)
  details(quote: Quote): string {
    const price = quote.priceAmount !== null ? formatPrice(quote.priceAmount, quote.currency, quote.priceUnit) : null;
    return [quote.clientName, price, shortDate(quote.sentAt)].filter((part) => !!part).join(' · ');
  }

  // un brouillon rouvre la page de reponse (avec ?from=quotes pour revenir ici ensuite), les autres leur detail
  link(quote: Quote): string[] {
    return quote.status === 'draft'
      ? ['/producer/requests', quote.requestId, 'reply']
      : ['/producer/requests/quotes', quote.replyId];
  }

  badge(quote: Quote): { label: string; style: string } {
    return quoteBadge(quote.status);
  }
}
