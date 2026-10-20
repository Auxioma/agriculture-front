import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { FaqService } from '../../home/faq.service';
import { shortDate } from '../request-format';
import { SupportService, SupportTicket } from './support.service';

const STATUSES: Record<string, { label: string; style: string }> = {
  open: { label: 'Ouvert', style: 'bg-warning/30 text-fonts' },
  in_progress: { label: 'En cours', style: 'bg-warning/30 text-fonts' },
  resolved: { label: 'Résolu', style: 'bg-badge-bg text-agri' },
  closed: { label: 'Fermé', style: 'bg-grey-200 text-grey-700' },
};

// page "Support" semblable au figma : trois questions de la FAQ, celles des producteurs de preference (GET /api/faq,
// le meme service que le site public), un formulaire qui cree un ticket (POST /api/support/tickets) et la liste de ses tickets. L'adresse
// e-mail et le delai de reponse de la maquette ne sont pas repris (voir NOTES.md). Un ticket ne s'ouvre pas encore :
// les reponses de l'equipe se liront dans une page de detail, a faire.
@Component({
  selector: 'app-producer-support',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './support.component.html',
})
export class SupportComponent {
  private service = inject(SupportService);

  faq = toSignal(
    inject(FaqService).getAll().pipe(
      map((articles) => {
        // la rubrique des producteurs d'abord, sinon les premieres questions
        const forProducers = articles.filter((a) => a.category?.toLowerCase().startsWith('producteur'));
        return (forProducers.length ? forProducers : articles).slice(0, 3);
      }),
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );

  // undefined = chargement, null = erreur
  tickets = signal<SupportTicket[] | null | undefined>(undefined);
  subject = signal('');
  message = signal('');
  sending = signal(false);
  notice = signal('');
  error = signal('');

  readonly shortDate = shortDate;

  constructor() {
    this.loadTickets();
  }

  badge(ticket: SupportTicket): { label: string; style: string } {
    return STATUSES[ticket.status] ?? { label: ticket.status, style: 'bg-grey-200 text-grey-700' };
  }

  submit(): void {
    const subject = this.subject().trim();
    const message = this.message().trim();
    this.notice.set('');
    if (!subject || !message) {
      this.error.set('Indiquez un sujet et votre message.');
      return;
    }

    this.error.set('');
    this.sending.set(true);
    this.service.createTicket(subject, message).subscribe({
      next: () => {
        this.sending.set(false);
        this.subject.set('');
        this.message.set('');
        this.notice.set('Message envoyé. Notre équipe vous répondra.');
        this.loadTickets();
      },
      error: (err: HttpErrorResponse) => {
        this.sending.set(false);
        this.error.set(err.error?.error ?? "Impossible d'envoyer votre message pour le moment.");
      },
    });
  }

  private loadTickets(): void {
    this.service.getTickets().subscribe({
      next: (tickets) => this.tickets.set(tickets),
      error: () => this.tickets.set(null),
    });
  }
}
