import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClientRequestItem, RequestStatus } from './client-request.model';
import { ClientRequestsService } from './client-requests.service';

type Filter = 'all' | 'pending' | 'replied' | 'archived';

const STATUS_UI: Record<RequestStatus, { label: string; filter: Filter; badge: string }> = {
  sent: { label: 'En attente', filter: 'pending', badge: 'bg-gold-wheat text-white' },
  waiting_replies: { label: 'En attente', filter: 'pending', badge: 'bg-gold-wheat text-white' },
  replies_received: { label: 'Réponses reçues', filter: 'replied', badge: 'bg-agri text-white' },
  conversation_open: {
    label: 'Conversation ouverte',
    filter: 'replied',
    badge: 'bg-agri text-white',
  },
  archived: {
    label: 'Archivée',
    filter: 'archived',
    badge: 'border border-grey-400 text-grey-700',
  },
  expired: { label: 'Expirée', filter: 'archived', badge: 'border border-grey-400 text-grey-700' },
};

@Component({
  selector: 'app-client-requests',
  imports: [RouterLink],
  templateUrl: './client-requests.component.html',
})
export class ClientRequestsComponent {
  private readonly api = inject(ClientRequestsService);

  readonly filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Toutes' },
    { key: 'pending', label: 'En attente' },
    { key: 'replied', label: 'Réponses reçues' },
    { key: 'archived', label: 'Archivées' },
  ];

  readonly requests = signal<ClientRequestItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly activeFilter = signal<Filter>('all');
  readonly openMenuId = signal<string | null>(null);

  // computed = valeur recalculée automatiquement quand requests ou activeFilter changent
  readonly visible = computed(() => {
    const f = this.activeFilter();
    return f === 'all'
      ? this.requests()
      : this.requests().filter((r) => STATUS_UI[r.status].filter === f);
  });

  constructor() {
    this.load();
  }

  ui(status: RequestStatus) {
    return STATUS_UI[status];
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }

  toggleMenu(id: string, event: Event) {
    event.stopPropagation(); // évite que le clic ferme aussitôt le menu
    this.openMenuId.update((current) => (current === id ? null : id));
  }

  @HostListener('document:click')
  closeMenu() {
    this.openMenuId.set(null);
  }

  cancel(id: string) {
    this.api.cancel(id).subscribe(() => this.load());
  }
  archive(id: string) {
    this.api.archive(id).subscribe(() => this.load());
  }
  duplicate(id: string) {
    this.api.duplicate(id).subscribe(() => this.load());
  }

  private load() {
    this.loading.set(true);
    this.error.set(false);
    this.api.list().subscribe({
      next: (data) => {
        this.requests.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
