import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { requestQuantity, shortDate } from '../../request-format';
import { ReceivedRequest, RequestsService } from '../requests.service';

type StatusFilter = 'all' | 'new' | 'treated';

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'new', label: 'Nouvelles' },
  { id: 'treated', label: 'Traitées' },
];

// page "Demandes reçues", branchee sur GET /api/producer/requests/received. On y arrive par le
// bouton "Voir les demandes reçues" du dashboard ; le lien en haut ramene aux demandes disponibles. Une demande
// qui n'est plus ouverte (expiree, annulee) apparait seulement dans "Toutes", sans badge.
@Component({
  selector: 'app-producer-received',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './received.component.html',
})
export class ReceivedComponent {
  // undefined = chargement, null = erreur (back injoignable, compte sans profil producteur...)
  requests = toSignal(inject(RequestsService).getReceived().pipe(catchError(() => of(null))));

  readonly filters = FILTERS;
  filter = signal<StatusFilter>('all');

  visibleRequests = computed(() =>
    (this.requests() ?? []).filter((r) => this.filter() === 'all' || r.status === this.filter()),
  );

  // ex. "Camille R. · Tomates bio 20kg"
  title(request: ReceivedRequest): string {
    const product = request.product ?? 'Demande';
    return `${request.clientName} · ${product}${request.quantity === null ? '' : ` ${requestQuantity(request)}`}`;
  }

  // ex. "Reçue le 18 août", puis "Répondu le 16 août" ou "Refusée le 12 août" une fois traitée
  subtitle(request: ReceivedRequest): string {
    if (request.status !== 'treated' || !request.respondedAt) return `Reçue le ${shortDate(request.receivedAt)}`;
    return `${request.declined ? 'Refusée' : 'Répondu'} le ${shortDate(request.respondedAt)}`;
  }

  badge(request: ReceivedRequest): { label: string; style: string } | null {
    if (request.status === 'treated') return { label: 'Traitée', style: 'bg-grey-400 text-grey-700' };
    if (request.status === 'closed') return null;
    return request.urgent
      ? { label: 'Urgente', style: 'bg-warning text-fonts' }
      : { label: 'Nouvelle', style: 'bg-agri text-white' };
  }
}
