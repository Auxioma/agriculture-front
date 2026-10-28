import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, Observable, catchError, combineLatest, of, switchMap } from 'rxjs';
import { longDate, requestQuantity, shortDate, unitLabel } from '../../request-format';
import { RequestDetail, RequestsService } from '../requests.service';

const CLIENT_TYPES = { individual: 'Client particulier', professional: 'Client professionnel' };

// page "Detail de la demande" semblable au figma, branchee sur GET /api/producer/requests/{id}. On y arrive en
// cliquant une carte de "Demandes disponibles" ou de "Demandes reçues". "Repondre" mene a la page de reponse et
// "Signaler" a celle du signalement ; "Ouvrir le chat" n'a pas de destination : une conversation n'existe qu'apres une reponse, voir NOTES.md.
// Une demande deja traitee, archivee ou plus ouverte n'a plus les boutons "Repondre" / "Ouvrir le chat".
// "Refuser poliment" (avec confirmation) et "Archiver cette demande" sont les deux autres actions du cahier : le refus
// la range dans les traitees, l'archivage la met de cote pour ce producteur seulement.

@Component({
  selector: 'app-producer-request-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './detail.component.html',
})
export class DetailComponent {
  private service = inject(RequestsService);
  private refresh = new BehaviorSubject<void>(undefined);

  // undefined = chargement, null = erreur (demande inconnue ou pas proposee a ce producteur...)
  request = toSignal(
    combineLatest([inject(ActivatedRoute).paramMap, this.refresh]).pipe(
      switchMap(([params]) => this.service.getDetail(params.get('id') ?? '').pipe(catchError(() => of(null)))),
    ),
  );

  confirmingDecline = signal(false);
  busy = signal(false);
  error = signal('');

  decline(request: RequestDetail): void {
    this.run(this.service.declineRequest(request.requestId));
  }

  archive(request: RequestDetail): void {
    this.run(this.service.archiveRequest(request.requestId));
  }

  // apres l'action on recharge la demande : la page affiche son nouvel etat
  private run(call: Observable<unknown>): void {
    this.busy.set(true);
    this.error.set('');
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.confirmingDecline.set(false);
        this.refresh.next();
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(err.error?.error ?? "Action impossible pour le moment.");
      },
    });
  }

  // une ligne par information connue (label a gauche, valeur a droite), comme la maquette
  rows = computed(() => {
    const r = this.request();
    if (!r) return [];

    const city = r.city && r.department ? `${r.city} (${r.department})` : r.city;
    const place = [city, r.distanceKm !== null ? `${r.distanceKm} km` : null].filter((part) => !!part).join(' · ');
    const pickupOrDelivery =
      r.pickupWanted && r.deliveryWanted ? 'Retrait ou livraison' : r.pickupWanted ? 'Retrait à la ferme' : r.deliveryWanted ? 'Livraison' : null;

    return [
      { label: 'Quantité', value: r.quantity !== null ? requestQuantity(r, true) : null },
      {
        label: 'Budget indicatif',
        value: r.budgetMax !== null ? `${r.budgetMax} ${r.currency ?? '€'}${r.unit ? `/${unitLabel(r)}` : ''}` : null,
      },
      { label: 'Date souhaitée', value: r.desiredDate ? longDate(r.desiredDate) : null },
      { label: 'Localisation', value: place },
      { label: 'Retrait / livraison', value: pickupOrDelivery },
    ].filter((row) => !!row.value);
  });

  clientType(request: RequestDetail): string {
    return CLIENT_TYPES[request.clientType];
  }

  // ex. "Vous avez répondu à cette demande le 16 août."
  treatedText(request: RequestDetail): string {
    const date = request.respondedAt ? ` le ${shortDate(request.respondedAt)}` : '';
    return `Vous avez ${request.declined ? 'refusé' : 'répondu à'} cette demande${date}.`;
  }
}
