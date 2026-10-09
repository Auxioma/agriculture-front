import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { longDate, requestQuantity, requestTitle } from '../../../request-format';
import { QuoteDetail, RequestsService } from '../../requests.service';
import { formatPrice, quoteBadge, validityDays } from '../quote-format';

const CLIENT_TYPES = { individual: 'Client particulier', professional: 'Client professionnel' };

// page "Detail du devis", branchee sur GET /api/producer/quotes/{id}. On y arrive en cliquant un
// devis de la page "Mes devis". Les boutons n'ont pas encore de destination : modifier un devis envoye, relancer le
// client (message ou notification, donc lie a la messagerie) et archiver (le statut est partage avec le cote
// client) sont a voir avec la section client, voir NOTES.md. Le bouton "Accepter le devis" de la maquette mobile
// n'est pas fait : c'est le client qui accepte un devis, pas le producteur (cahier fonctionnel, statuts d'une reponse)

@Component({
  selector: 'app-producer-quote-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './quote-detail.component.html',
})
export class QuoteDetailComponent {
  private service = inject(RequestsService);

  // undefined = chargement, null = erreur (devis inconnu, brouillon, devis d'un autre producteur...)
  quote = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      switchMap((params) => this.service.getQuote(params.get('id') ?? '').pipe(catchError(() => of(null)))),
    ),
  );

  readonly requestTitle = requestTitle;

  // une ligne par information connue (label a gauche, valeur a droite), comme la maquette
  rows = computed(() => {
    const q = this.quote();
    if (!q) return [];

    const days = q.validUntil ? validityDays(q.sentAt, q.validUntil) : 0;

    return [
      { label: 'Prix indicatif', value: formatPrice(q.priceAmount, q.currency, q.priceUnit) },
      {
        label: 'Quantité disponible',
        value: q.availableQuantity !== null ? requestQuantity({ quantity: q.availableQuantity, unit: q.unit }, true) : null,
      },
      { label: 'Date disponible', value: q.availabilityDate ? longDate(q.availabilityDate) : null },
      { label: 'Durée de validité', value: days > 0 ? `${days} jour${days > 1 ? 's' : ''}` : null },
      { label: 'Conditions de retrait', value: q.pickupConditions },
      { label: 'Conditions de livraison', value: q.deliveryConditions },
    ].filter((row) => !!row.value);
  });

  // ex. "CR" pour "Camille R."
  initials(quote: QuoteDetail): string {
    return quote.clientName
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  clientType(quote: QuoteDetail): string {
    return CLIENT_TYPES[quote.clientType];
  }

  badge(quote: QuoteDetail): { label: string; style: string } {
    return quoteBadge(quote.status);
  }

  // on ne modifie ni ne relance un devis que le client a deja tranche (accepte, refuse) ou qui n'est plus valable
  canEditOrFollowUp(quote: QuoteDetail): boolean {
    return quote.status === 'sent' || quote.status === 'seen';
  }
}
