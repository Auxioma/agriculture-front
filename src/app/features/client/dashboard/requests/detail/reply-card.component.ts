import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { initials } from '../../../utils/initials';
import { UI } from '../../profile/ui/ui-classes';
import { Reply, ReplyReview } from './reply.model';
import {
  REPLY_STATUS_UI,
  REVIEW_STATUS_LABEL,
  dayLabel,
  isUndecided,
  priceLabel,
  unitLabel,
} from './reply-format';
import { ReviewFormComponent } from './review-form.component';

/**
 * Une réponse de producteur : de quoi la comparer aux autres (prix, quantité, date, distance, conditions), en parler (chat), la
 * retenir ou non, puis donner son avis sur le producteur.
 */
@Component({
  selector: 'app-reply-card',
  imports: [RouterLink, ReviewFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article [class]="ui.panel" [attr.aria-label]="'Réponse de ' + reply().producer.name">
      <header class="flex items-start gap-3">
        <span
          aria-hidden="true"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-badge-bg text-sm font-bold text-agri"
        >
          {{ initials(reply().producer.name) }}
        </span>
        <div class="min-w-0 flex-1">
          <h3 class="truncate font-semibold">
            <a [routerLink]="['/producers', reply().producer.slug]">{{ reply().producer.name }}</a>
          </h3>
          <p class="text-xs text-grey-700">
            {{ place() }}
            @if (reply().producer.verified) {
              <span class="ml-1 font-medium text-agri">Profil vérifié</span>
            }
          </p>
        </div>
        <span
          class="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
          [class]="statusUi().badge"
        >
          {{ statusUi().label }}
        </span>
      </header>

      @if (price(); as amount) {
        <p class="mt-3 text-2xl font-bold text-agri">
          {{ amount }}
          @if (reply().priceUnit) {
            <span class="text-sm font-medium text-grey-700">/ {{ unit(reply().priceUnit) }}</span>
          }
        </p>
      } @else {
        <p class="mt-3 text-sm text-grey-700">Le producteur n'a pas indiqué de prix.</p>
      }

      @if (details().length) {
        <dl class="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          @for (row of details(); track row.label) {
            <div>
              <dt class="text-xs text-grey-700">{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          }
        </dl>
      }

      @if (reply().message) {
        <p class="mt-3 whitespace-pre-line rounded-lg bg-badge-bg px-3 py-2 text-sm">
          {{ reply().message }}
        </p>
      }

      @if (reply().attachments.length) {
        <ul class="mt-3 space-y-1 text-sm">
          @for (file of reply().attachments; track file.id) {
            @if (file.fileUrl) {
              <li>
                <a [href]="file.fileUrl" target="_blank" rel="noopener" class="font-medium text-agri underline">
                  {{ file.fileName ?? 'Pièce jointe' }}
                </a>
              </li>
            }
          }
        </ul>
      }

      <div class="mt-4 flex flex-wrap items-center gap-2">
        @if (reply().conversationId) {
          <a [routerLink]="['/client/messages', reply().conversationId]" [class]="ui.secondary">
            Discuter
          </a>
        }
        @if (canDecide()) {
          <button type="button" [disabled]="busy()" (click)="accept.emit(reply().id)" [class]="ui.primary">
            Accepter
          </button>
          <button
            type="button"
            [disabled]="busy()"
            (click)="decline.emit(reply().id)"
            class="cursor-pointer rounded-lg border border-grey-400 px-4 py-2 text-sm font-medium text-grey-700 disabled:opacity-50"
          >
            Refuser
          </button>
        }
      </div>

      @if (reply().status === 'accepted') {
        <div class="mt-3 border-t border-grey-200 pt-3 text-sm">
          @if (reply().review; as review) {
            <p>
              Votre avis : <span class="text-gold-wheat" aria-hidden="true">{{ stars(review) }}</span>
              <span class="sr-only">{{ review.rating }} sur 5,</span>
              {{ reviewStatus(review) }}
            </p>
          } @else if (reply().conversationId) {
            @if (reviewing()) {
              <app-review-form
                [requestId]="requestId()"
                [producerId]="reply().producer.id"
                (sent)="reviewSent.emit({ replyId: reply().id, review: $event }); reviewing.set(false)"
                (cancelled)="reviewing.set(false)"
              />
            } @else {
              <button
                type="button"
                (click)="reviewing.set(true)"
                class="cursor-pointer font-medium text-agri underline"
              >
                Laisser un avis sur ce producteur
              </button>
            }
          }
        </div>
      }
    </article>
  `,
})
export class ReplyCardComponent {
  protected readonly ui = UI;
  protected readonly initials = initials;
  protected readonly unit = unitLabel;

  readonly reply = input.required<Reply>();
  readonly requestId = input.required<string>();
  /** La demande est encore ouverte : on peut retenir ou refuser cette réponse. */
  readonly open = input(false);
  /** Une décision est en cours d'envoi. */
  readonly busy = input(false);

  readonly accept = output<string>();
  readonly decline = output<string>();
  readonly reviewSent = output<{ replyId: string; review: ReplyReview }>();

  readonly reviewing = signal(false);

  readonly statusUi = computed(() => REPLY_STATUS_UI[this.reply().status]);
  readonly canDecide = computed(() => this.open() && isUndecided(this.reply().status));
  readonly price = computed(() => priceLabel(this.reply()));

  /** « Lyon · à 11,1 km » */
  readonly place = computed(() => {
    const { city, distanceKm } = this.reply().producer;
    const distance =
      distanceKm === null ? null : `à ${distanceKm.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
    return [city, distance].filter(Boolean).join(' · ');
  });

  readonly details = computed(() => {
    const r = this.reply();
    const rows = [
      {
        label: 'Quantité disponible',
        value: r.availableQuantity === null ? null : `${r.availableQuantity} ${unitLabel(r.quantityUnit)}`.trim(),
      },
      { label: 'Disponible le', value: r.availabilityDate ? dayLabel(r.availabilityDate) : null },
      { label: "Valable jusqu'au", value: r.validUntil ? dayLabel(r.validUntil) : null },
      { label: 'Retrait', value: r.pickupConditions },
      { label: 'Livraison', value: r.deliveryConditions },
      { label: 'Conditions', value: r.conditions },
    ];
    return rows.filter((row): row is { label: string; value: string } => !!row.value);
  });

  stars(review: ReplyReview): string {
    return '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  }

  reviewStatus(review: ReplyReview): string {
    return `(${REVIEW_STATUS_LABEL[review.status]})`;
  }
}
