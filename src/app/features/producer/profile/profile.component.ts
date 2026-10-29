import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { formatRadius, summarizeOpeningHours } from '../../catalog/utils/producer-format';
import { availability, initials, largestRadius, shownLabels } from './profile-format';
import { ProfileService } from './profile.service';

const VERIFICATION: Record<string, { text: string; verified: boolean }> = {
  verified: { text: 'Vérifié', verified: true },
  pending: { text: 'Vérification en cours', verified: false },
};

//! mon exploitation. Avis clients et Statistiques n'ont pas encore de destination
@Component({
  selector: 'app-producer-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  // undefined = chargement, null = erreur (back injoignable, compte sans profil producteur...)
  exploitation = toSignal(inject(ProfileService).getExploitation().pipe(catchError(() => of(null))));

  readonly actions: { label: string; link?: string; style: string }[] = [
    { label: 'Modifier mon profil', link: '/producer/profile/edit', style: 'bg-agri text-white' },
    { label: 'Avis clients', style: 'bg-gold-wheat text-fonts' },
    { label: 'Statistiques', link: '/producer/profile/statistics', style: 'border border-agri bg-badge-bg text-agri' },
    { label: 'Paramètres', link: '/producer/profile/settings', style: 'border border-grey-400 bg-grey-200 text-grey-700' },
  ];

  initials = computed(() => initials(this.exploitation()?.profile.farmName ?? ''));
  verification = computed(() => VERIFICATION[this.exploitation()?.profile.verificationStatus ?? ''] ?? null);
  labels = computed(() => shownLabels(this.exploitation()?.labels ?? []));

  // une valeur null s'affiche "À renseigner" : le producteur voit ce qu'il lui reste a remplir
  rows = computed(() => {
    const data = this.exploitation();
    if (!data) return [];
    const radius = largestRadius(data.zones);

    return [
      { label: 'Zone de vente', value: radius === null ? null : formatRadius(radius) },
      { label: 'Horaires', value: summarizeOpeningHours(data.openingHours) },
      { label: 'Retrait', value: availability(data.profile.pickupAvailable, 'À la ferme', 'Non proposé') },
      { label: 'Livraison', value: availability(data.profile.deliveryAvailable, 'Possible', 'Non proposée') },
    ];
  });
}
