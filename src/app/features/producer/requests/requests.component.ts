import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvailableRequest } from '../dashboard/dashboard.model';
import { requestDetails, requestTitle } from '../request-format';
import { RequestsService } from './requests.service';
import { PageSkeletonComponent } from '../../../core/layout/page-skeleton/page-skeleton.component';
import { LoadMoreComponent } from '../../../core/layout/load-more/load-more.component';
import { PagedList } from '../../../core/http/paged-list';

type Toggle = 'urgent' | 'near' | 'volume' | 'budget';

const TOGGLES: Record<Toggle, (request: AvailableRequest) => boolean> = {
  urgent: (r) => r.urgent,
  near: (r) => r.distanceKm !== null && r.distanceKm < 10,
  volume: (r) => r.highVolume,
  budget: (r) => r.budgetMax !== null,
};

const CHIP = 'shrink-0 cursor-pointer appearance-none field-sizing-content rounded-full border py-1.5 text-xs font-medium';

// page "Demandes disponibles" semblable au figma, branchee sur GET /api/producer/requests/available. Les chips se
// cumulent (urgentes + moins de 10 km...) ; "Produit" et "Type de client" sont des listes en forme de chip. Le lien
// "Voir mes devis" mene a la page Mes devis : bouton fixe en bas en mobile, en haut a droite en desktop.
@Component({
  selector: 'app-producer-requests',
  standalone: true,
  imports: [RouterLink, PageSkeletonComponent, LoadMoreComponent],
  templateUrl: './requests.component.html',
})
export class RequestsComponent {
  private service = inject(RequestsService);

  // par pages (« Voir plus ») : les chips et les listes ne trient que les demandes deja chargees
  readonly list = new PagedList((page) => this.service.getAvailablePage(page), (r) => r.requestId);
  // undefined = chargement, null = erreur (back injoignable, compte sans profil producteur...)
  requests = this.list.items;

  private toggles = signal<Toggle[]>([]);
  product = signal('');
  clientType = signal('');

  // sans abonnement les demandes sont en aperçu limité : un bouton de déblocage les accompagne
  previewOnly = computed(() => (this.requests() ?? []).some((r) => r.locked));

  products = computed(() => [...new Set((this.requests() ?? []).map((r) => r.product).filter((p): p is string => !!p))]);

  isFiltered = computed(() => this.toggles().length > 0 || !!this.product() || !!this.clientType());

  visibleRequests = computed(() =>
    (this.requests() ?? []).filter(
      (r) =>
        this.toggles().every((t) => TOGGLES[t](r)) &&
        (!this.product() || r.product === this.product()) &&
        (!this.clientType() || r.clientType === this.clientType()),
    ),
  );

  isOn(toggle: Toggle): boolean {
    return this.toggles().includes(toggle);
  }

  toggle(toggle: Toggle): void {
    this.toggles.update((on) => (on.includes(toggle) ? on.filter((t) => t !== toggle) : [...on, toggle]));
  }

  reset(): void {
    this.toggles.set([]);
    this.product.set('');
    this.clientType.set('');
  }

  // dropdown : plus de place a droite pour la fleche
  chip(active: boolean, dropdown = false): string {
    return `${CHIP} ${dropdown ? 'pl-3 pr-7' : 'px-3'} ${active ? 'border-agri bg-agri text-white' : 'border-grey-400 bg-white text-grey-700'}`;
  }

  // un seul badge par carte, comme sur la maquette : urgent d'abord, puis volume, puis nouveau
  badge(request: AvailableRequest): { label: string; style: string } | null {
    if (request.urgent) return { label: 'Urgent', style: 'bg-warning text-fonts' };
    if (request.highVolume) return { label: 'Volume élevé', style: 'border border-grey-400 text-secondary' };
    if (request.isNew) return { label: 'Nouveau', style: 'bg-agri text-white' };
    return null;
  }

  readonly requestTitle = requestTitle;
  details = (request: AvailableRequest) => requestDetails(request, true);
}
