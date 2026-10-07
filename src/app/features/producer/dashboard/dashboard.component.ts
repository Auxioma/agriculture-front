import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { requestDetails, requestTitle } from '../request-format';
import { DashboardService } from './dashboard.service';

type RequestFilter = 'urgent' | 'all' | 'near';

const FILTERS: { id: RequestFilter; label: string; title: string }[] = [
  { id: 'all', label: 'Tout', title: 'Demandes disponibles' },
  { id: 'urgent', label: 'Urgentes', title: 'Demandes urgentes' },
  { id: 'near', label: '< 10 km', title: 'Demandes à moins de 10 km' },
];

const SUBSCRIPTION_STATUSES: Record<string, string> = {
  active: 'Actif',
  trialing: "Période d'essai",
  past_due: 'Paiement en retard',
  cancelled: 'Annulé',
  expired: 'Expiré',
};
const MISSING_PROFILE_PARTS: Record<string, string> = {
  description: 'votre description',
  photos: 'vos photos',
  labels: 'vos labels',
  products: 'vos produits',
  availability: 'vos disponibilités',
  zones: 'vos zones de vente',
};

// dashboard producteur semblable au figma, branche sur GET /api/producer/dashboard (un seul appel : chiffres,
// demandes disponibles, abonnement et completion du profil). Les chips de filtre ne sont affichees qu'en mobile,
// comme sur la maquette : en desktop on reste sur "Urgentes". Les boutons n'ont pas encore de destination :
// les pages demandes / abonnement / profil / produits n'existent pas.
@Component({
  selector: 'app-producer-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  // undefined = chargement, null = erreur (back injoignable, compte sans profil producteur...)
  dashboard = toSignal(inject(DashboardService).getDashboard().pipe(catchError(() => of(null))));

  readonly filters = FILTERS;
  filter = signal<RequestFilter>('urgent');

  filterTitle = computed(() => FILTERS.find((f) => f.id === this.filter())!.title);

  visibleRequests = computed(() => {
    const requests = this.dashboard()?.requests ?? [];
    switch (this.filter()) {
      case 'urgent':
        return requests.filter((r) => r.urgent);
      case 'near':
        return requests.filter((r) => r.distanceKm !== null && r.distanceKm < 10);
      default:
        return requests;
    }
  });

  quotaPercent = computed(() => {
    const subscription = this.dashboard()?.subscription;
    return subscription?.requestsQuota
      ? Math.min(100, Math.round((100 * subscription.requestsThisMonth) / subscription.requestsQuota))
      : null;
  });

  subscriptionStatus = computed(() => {
    const status = this.dashboard()?.subscription?.status ?? '';
    return SUBSCRIPTION_STATUSES[status] ?? status;
  });

  profileHint = computed(() => {
    const parts = (this.dashboard()?.profile.missing ?? []).slice(0, 2).map((m) => MISSING_PROFILE_PARTS[m] ?? m);
    return parts.length ? `Ajoutez ${parts.join(' et ')} pour être plus visible.` : 'Votre profil est complet.';
  });

  readonly requestTitle = requestTitle;
  readonly requestDetails = requestDetails;
}
