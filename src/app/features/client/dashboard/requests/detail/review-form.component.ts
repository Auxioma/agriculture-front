import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { apiErrorMessage } from '../../profile/api-error';
import { UI } from '../../profile/ui/ui-classes';
import { ReplyReview } from './reply.model';
import { RepliesService } from './replies.service';

/**
 * Avis sur un producteur, pour une demande (cahier : avis après un échange, avec modération). Le back refuse un second avis
 * pour la même demande et le même producteur, et l'avis part « en attente » : il n'est publié qu'après modération.
 */
@Component({
  selector: 'app-review-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form
      (submit)="$event.preventDefault(); submit()"
      class="mt-3 space-y-3 rounded-lg border border-grey-200 p-3"
    >
      <fieldset>
        <legend class="mb-1 text-sm font-medium">Votre note</legend>
        <div class="flex gap-1">
          @for (star of stars; track star) {
            <button
              type="button"
              [attr.aria-label]="star + (star > 1 ? ' étoiles' : ' étoile')"
              [attr.aria-pressed]="rating() === star"
              (click)="rating.set(star)"
              class="cursor-pointer text-3xl leading-none"
              [class]="star <= rating() ? 'text-gold-wheat' : 'text-grey-400'"
            >
              ★
            </button>
          }
        </div>
      </fieldset>

      <div>
        <label [for]="'review-comment-' + producerId()" [class]="ui.label">
          Commentaire (facultatif)
        </label>
        <textarea
          [id]="'review-comment-' + producerId()"
          #box
          rows="3"
          maxlength="5000"
          [value]="comment()"
          (input)="comment.set(box.value)"
          [class]="ui.input"
        ></textarea>
      </div>

      @if (error()) {
        <p role="alert" [class]="ui.error">{{ error() }}</p>
      }

      <div class="flex gap-2">
        <button type="submit" [disabled]="sending()" [class]="ui.primary">Envoyer l'avis</button>
        <button
          type="button"
          (click)="cancelled.emit()"
          class="cursor-pointer rounded-lg border border-grey-400 px-4 py-2 text-sm font-medium text-grey-700"
        >
          Annuler
        </button>
      </div>
    </form>
  `,
})
export class ReviewFormComponent {
  private readonly replies = inject(RepliesService);
  protected readonly ui = UI;

  readonly requestId = input.required<string>();
  readonly producerId = input.required<string>();
  /** L'avis tel que le back l'a enregistré (note + statut de modération). */
  readonly sent = output<ReplyReview>();
  readonly cancelled = output<void>();

  readonly stars = [1, 2, 3, 4, 5];
  readonly rating = signal(0);
  readonly comment = signal('');
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    if (this.sending()) return;
    if (this.rating() === 0) {
      this.error.set('Choisissez une note de 1 à 5.');
      return;
    }

    this.sending.set(true);
    this.error.set(null);
    const rating = this.rating();
    this.replies
      .review({
        requestId: this.requestId(),
        producerId: this.producerId(),
        rating,
        comment: this.comment().trim() || null,
      })
      .subscribe({
        next: (saved) => {
          this.sending.set(false);
          this.sent.emit({ rating, status: saved.status });
        },
        error: (err) => {
          this.sending.set(false);
          this.error.set(apiErrorMessage(err, "Impossible d'enregistrer votre avis."));
        },
      });
  }
}
