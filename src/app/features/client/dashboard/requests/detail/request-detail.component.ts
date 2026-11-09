import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FilterTabsComponent } from '../../../ui/filter-tabs.component';
import { apiErrorMessage } from '../../profile/api-error';
import { STATUS_UI } from '../request-status';
import { Reply, ReplyReview, RequestReplies } from './reply.model';
import { OPEN_REQUEST, dayLabel, requestLabel } from './reply-format';
import { RepliesService } from './replies.service';
import { ReplyCardComponent } from './reply-card.component';

type Sort = 'recent' | 'price' | 'distance';

/**
 * Détail d'une demande côté client : ce qu'on a demandé et les réponses des producteurs, à comparer (cahier fonctionnel : "Réponses /
 * devis -- comparaison des propositions, prix indicatif, disponibilité, distance, CTA chat"). On y accepte ou refuse une réponse, on
 * ouvre le chat avec le producteur et, une fois la réponse acceptée, on laisse un avis.
 */
@Component({
  selector: 'app-request-detail',
  imports: [RouterLink, FilterTabsComponent, ReplyCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-4 px-4 py-6 lg:px-0 lg:py-0">
      <a routerLink="/client/requests" class="inline-block text-sm font-semibold text-agri underline">
        Mes demandes
      </a>

      @if (loading()) {
        <p class="text-sm text-grey-700">Chargement…</p>
      } @else if (data(); as d) {
        <header class="space-y-1">
          <h1 class="text-xl font-bold lg:text-2xl">{{ title() }}</h1>
          <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-grey-700">
            <span class="rounded-full px-3 py-0.5 text-xs font-medium" [class]="status().badge">
              {{ status().label }}
            </span>
            <span>Envoyée le {{ day(d.request.sentAt) }}</span>
            @if (d.request.city) {
              <span>{{ d.request.city }}</span>
            }
            @if (d.request.desiredDate) {
              <span>Pour le {{ day(d.request.desiredDate) }}</span>
            }
          </p>
        </header>

        <h2 class="text-base font-semibold">
          Réponses des producteurs
          @if (d.replies.length) {
            <span class="font-normal text-grey-700">({{ d.replies.length }})</span>
          }
        </h2>

        @if (actionError()) {
          <p role="alert" class="text-sm text-danger">{{ actionError() }}</p>
        }

        @if (d.replies.length === 0) {
          <p class="text-sm text-grey-700">
            Aucun producteur n'a encore répondu. Vous êtes prévenu dès qu'une réponse arrive.
          </p>
        } @else {
          @if (d.replies.length > 1) {
            <app-filter-tabs ariaLabel="Trier les réponses" [tabs]="sorts" [(active)]="sort" />
          }
          <ul class="grid items-start gap-3 lg:grid-cols-2">
            @for (reply of sorted(); track reply.id) {
              <li>
                <app-reply-card
                  [reply]="reply"
                  [requestId]="d.request.id"
                  [open]="isOpen()"
                  [busy]="busyId() === reply.id"
                  (accept)="decide($event, 'accept')"
                  (decline)="decide($event, 'decline')"
                  (reviewSent)="reviewed($event.replyId, $event.review)"
                />
              </li>
            }
          </ul>
        }
      } @else {
        <p role="alert" class="text-sm text-danger">{{ error() }}</p>
      }
    </section>
  `,
})
export class RequestDetailComponent {
  private readonly api = inject(RepliesService);
  private readonly requestId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly day = dayLabel;
  readonly sorts: { key: Sort; label: string }[] = [
    { key: 'recent', label: 'Plus récentes' },
    { key: 'price', label: 'Prix croissant' },
    { key: 'distance', label: 'Plus proches' },
  ];

  readonly data = signal<RequestReplies | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly busyId = signal<string | null>(null);
  readonly sort = signal<Sort>('recent');

  readonly title = computed(() => {
    const d = this.data();
    return d ? requestLabel(d.request) : '';
  });
  readonly status = computed(() => STATUS_UI[this.data()?.request.status ?? 'sent']);
  readonly isOpen = computed(() => OPEN_REQUEST.includes(this.data()?.request.status ?? ''));

  /** Sans prix ou sans position, une réponse passe après les autres sur ce critère. */
  readonly sorted = computed<Reply[]>(() => {
    const replies = [...(this.data()?.replies ?? [])];
    const last = Number.POSITIVE_INFINITY;
    switch (this.sort()) {
      case 'price':
        return replies.sort((a, b) => (a.priceAmount ?? last) - (b.priceAmount ?? last));
      case 'distance':
        return replies.sort(
          (a, b) => (a.producer.distanceKm ?? last) - (b.producer.distanceKm ?? last),
        );
      default:
        return replies.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    }
  });

  constructor() {
    this.api.list(this.requestId).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(
          err.status === 404
            ? "Cette demande est introuvable ou n'est pas la vôtre."
            : apiErrorMessage(err, 'Impossible de charger cette demande.'),
        );
        this.loading.set(false);
      },
    });
  }

  decide(replyId: string, decision: 'accept' | 'decline'): void {
    if (this.busyId()) return;
    this.busyId.set(replyId);
    this.actionError.set('');
    const call = decision === 'accept' ? this.api.accept(replyId) : this.api.decline(replyId);
    call.subscribe({
      next: (saved) => {
        this.busyId.set(null);
        this.update(replyId, { status: saved.status });
      },
      error: (err) => {
        this.busyId.set(null);
        this.actionError.set(apiErrorMessage(err, 'Impossible d’enregistrer votre choix.'));
      },
    });
  }

  reviewed(replyId: string, review: ReplyReview): void {
    this.update(replyId, { review });
  }

  private update(replyId: string, patch: Partial<Reply>): void {
    this.data.update((d) =>
      d ? { ...d, replies: d.replies.map((r) => (r.id === replyId ? { ...r, ...patch } : r)) } : d,
    );
  }
}
