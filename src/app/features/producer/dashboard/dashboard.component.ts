import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { DashboardRequest } from './dashboard.model';
import { DashboardService } from './dashboard.service';

type RequestFilter = 'urgent' | 'all' | 'near';

const FILTERS: { id: RequestFilter; label: string; title: string }[] = [
  { id: 'all', label: 'Tout', title: 'Demandes disponibles' },
  { id: 'urgent', label: 'Urgentes', title: 'Demandes urgentes' },
  { id: 'near', label: '< 10 km', title: 'Demandes à moins de 10 km' },
];

const UNITS: Record<string, string> = { kg: 'kg', unite: 'unité' };
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

  requestTitle(request: DashboardRequest): string {
    const product = request.product ?? 'Demande';
    return request.quantity === null ? product : `${product} - ${this.quantity(request)}`;
  }

  // ex. "Lyon · 4 km · budget 12€/kg", ou le message du client quand il n'y a pas de budget
  requestDetails(request: DashboardRequest): string {
    const budget =
      request.budgetMax !== null ? `budget ${request.budgetMax}${request.currency ?? ''}${this.unitSuffix(request)}` : request.message;

    return [request.city, request.distanceKm !== null ? `${request.distanceKm} km` : null, budget]
      .filter((part) => !!part)
      .join(' · ');
  }

  private unit(request: DashboardRequest): string {
    return UNITS[request.unit ?? ''] ?? request.unit ?? '';
  }

  private unitSuffix(request: DashboardRequest): string {
    return request.unit ? `/${this.unit(request)}` : '';
  }

  private quantity(request: DashboardRequest): string {
    const unit = this.unit(request);
    if (unit === 'kg') return `${request.quantity}kg`;
    const plural = unit === 'unité' && request.quantity! > 1 ? 's' : '';
    return `${request.quantity} ${unit}${plural}`.trim();
  }
}
