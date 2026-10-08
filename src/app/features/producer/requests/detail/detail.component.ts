import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { longDate, requestQuantity, shortDate, unitLabel } from '../../request-format';
import { RequestDetail, RequestsService } from '../requests.service';

const CLIENT_TYPES = { individual: 'Client particulier', professional: 'Client professionnel' };

// page "Detail de la demande" semblable au figma, branchee sur GET /api/producer/requests/{id}. On y arrive en
// cliquant une carte de "Demandes disponibles" ou de "Demandes reçues". "Repondre" mene a la page de reponse ; "Ouvrir
// le chat" et "Signaler" n'ont pas encore de destination (la messagerie et le signalement d'une demande n'existent
// pas). Une demande deja traitee ou plus ouverte n'a plus les boutons "Repondre" / "Ouvrir le chat"

@Component({
  selector: 'app-producer-request-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './detail.component.html',
})
export class DetailComponent {
  private service = inject(RequestsService);

  // undefined = chargement, null = erreur (demande inconnue ou pas proposee a ce producteur...)
  request = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      switchMap((params) => this.service.getDetail(params.get('id') ?? '').pipe(catchError(() => of(null)))),
    ),
  );

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
