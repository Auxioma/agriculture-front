import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { messageOf } from '../message-of';
import { averageLabel, basedOn, reviewDate } from './reviews-format';
import { Review, ReviewsService } from './reviews.service';
import { StarsComponent } from './stars.component';

// page "Avis clients" semblable au figma, branchee sur GET /api/producer/reviews (page Profil, bouton "Avis clients"). Seuls les
// avis publies par la moderation s'y trouvent, ce sont les memes que sur la fiche publique. "Repondre" ouvre un champ dans la
// carte et envoie POST /api/reviews/{id}/response : la reponse est publique, le cahier la prevoit ("reponse du producteur a un
// avis"). Un avis deja repondu montre la reponse a la place du bouton ; le cahier ne parle pas de la modifier, la page ne le
// propose pas (le back, lui, accepterait un nouvel envoi).
@Component({
  selector: 'app-producer-reviews',
  standalone: true,
  imports: [RouterLink, StarsComponent],
  templateUrl: './reviews.component.html',
})
export class ReviewsComponent {
  private service = inject(ReviewsService);

  // undefined = chargement, null = erreur (back injoignable, compte sans profil producteur...)
  data = toSignal(this.service.list().pipe(catchError(() => of(null))));

  // les reponses envoyees depuis cette page s'affichent tout de suite, sans relire la liste
  private sent = signal<Record<string, string>>({});
  replying = signal<string | null>(null);
  draft = signal('');
  sending = signal(false);
  error = signal('');

  readonly averageLabel = averageLabel;
  readonly basedOn = basedOn;
  readonly date = reviewDate;

  responseOf(review: Review): string | null {
    return this.sent()[review.id] ?? review.producerResponse;
  }

  reply(review: Review): void {
    this.replying.set(review.id);
    this.draft.set('');
    this.error.set('');
  }

  cancel(): void {
    this.replying.set(null);
    this.error.set('');
  }

  send(review: Review): void {
    const response = this.draft().trim();
    if (!response || this.sending()) return;

    this.sending.set(true);
    this.error.set('');
    this.service.respond(review.id, response).subscribe({
      next: () => {
        this.sent.update((sent) => ({ ...sent, [review.id]: response }));
        this.sending.set(false);
        this.replying.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.sending.set(false);
        this.error.set(messageOf(err));
      },
    });
  }
}
