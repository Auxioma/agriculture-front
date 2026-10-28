import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { longDate, requestQuantity, requestTitle, shortDate } from '../../../request-format';
import { QuoteDetail, RequestsService } from '../../requests.service';
import { formatPrice, quoteBadge, validityDays } from '../quote-format';

const CLIENT_TYPES = { individual: 'Client particulier', professional: 'Client professionnel' };

// page "Detail du devis", branchee sur GET /api/producer/quotes/{id}. On y arrive en cliquant un
// devis de la page "Mes devis". "Archiver ce devis" pose le statut archive (POST .../archive) puis ramene a "Mes devis".
// "Relancer le client" n'a pas encore de destination. "Discuter avec le client" ouvre la messagerie sur la
// conversation de cette demande. Pas de "Modifier ce devis" : le cahier n'en prevoit pas (un devis envoye ne change plus, seul un brouillon
// se modifie). Le bouton "Accepter le devis" de la maquette mobile n'est pas fait non plus : c'est le client qui
// accepte un devis, pas le producteur (cahier fonctionnel, statuts d'une reponse).
// Un devis accepte (maquettes) affiche "Devis clos" et un bandeau "Accepte par ...". la date d'acceptation n'existe
// pas encore dans le back : le bandeau l'affiche des que le back la fournit (decidedAt), voir NOTES.md.

@Component({
  selector: 'app-producer-quote-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './quote-detail.component.html',
})
export class QuoteDetailComponent {
  private service = inject(RequestsService);
  private router = inject(Router);

  // undefined = chargement, null = erreur (devis inconnu, brouillon, devis d'un autre producteur...)
  quote = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      switchMap((params) => this.service.getQuote(params.get('id') ?? '').pipe(catchError(() => of(null)))),
    ),
  );
  error = signal('');

  archive(quote: QuoteDetail): void {
    this.error.set('');
    this.service.archiveQuote(quote.replyId).subscribe({
      next: () => this.router.navigate(['/producer/requests/quotes']),
      error: (err: HttpErrorResponse) => this.error.set(err.error?.error ?? "Impossible d'archiver ce devis pour le moment."),
    });
  }

  readonly requestTitle = requestTitle;

  // une ligne par information connue (label a gauche, valeur a droite), comme la maquette
  rows = computed(() => {
    const q = this.quote();
    if (!q) return [];

    const days = q.validUntil ? validityDays(q.sentAt, q.validUntil) : 0;
    // un devis que le client a tranche ou qui n'est plus valable est "clos" : plus de duree de validite a afficher
    const validity = this.canFollowUp(q) ? (days > 0 ? `${days} jour${days > 1 ? 's' : ''}` : null) : 'Devis clos';

    return [
      // une reponse sans prix (message seul) n'a pas cette ligne
      { label: 'Prix indicatif', value: q.priceAmount !== null ? formatPrice(q.priceAmount, q.currency, q.priceUnit) : null },
      {
        label: 'Quantité disponible',
        value: q.availableQuantity !== null ? requestQuantity({ quantity: q.availableQuantity, unit: q.unit }, true) : null,
      },
      { label: 'Date disponible', value: q.availabilityDate ? longDate(q.availabilityDate) : null },
      { label: 'Durée de validité', value: validity },
      { label: 'Conditions de retrait', value: q.pickupConditions },
      { label: 'Conditions de livraison', value: q.deliveryConditions },
    ].filter((row) => !!row.value);
  });

  // ex. "Accepté par Coopérative Sud le 9 août" (sans la date tant que le back ne la donne pas)
  acceptedText(quote: QuoteDetail): string {
    return `Accepté par ${quote.clientName}${quote.decidedAt ? ` le ${shortDate(quote.decidedAt)}` : ''}`;
  }

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

  // on ne relance pas un devis que le client a deja tranche (accepte, refuse) ou qui n'est plus valable
  canFollowUp(quote: QuoteDetail): boolean {
    return quote.status === 'sent' || quote.status === 'seen';
  }
}
