import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { requestQuantity } from '../../request-format';
import { RequestDetail, RequestsService } from '../requests.service';

// les codes sont ceux que le back accepte (ReportClientRequestRequest)
const REASONS = [
  { code: 'fraud', label: 'Demande frauduleuse ou fictive', hint: null },
  { code: 'inappropriate', label: 'Contenu inapproprié ou injurieux', hint: null },
  {
    code: 'circumvention',
    label: 'Coordonnées suspectes ou tentative de contournement de la plateforme',
    hint: 'Le client cherche à échanger en dehors de TrouveMoi Agri.',
  },
  { code: 'out_of_scope', label: 'Demande hors périmètre agricole', hint: null },
  { code: 'other', label: 'Autre', hint: null },
];

// page "Signaler cette demande" semblable au figma, branchee sur POST /api/producer/requests/{id}/report. Aucun motif
// n'est coche d'avance : un signalement par erreur coute du temps a la moderation. La demande garde son statut, le
// producteur peut continuer a echanger avec le client pendant l'examen (c'est le texte de la page). Le delai de
// traitement de la maquette n'est pas repris : le cahier n'en fixe aucun, voir NOTES.md.
@Component({
  selector: 'app-producer-report',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './report.component.html',
})
export class ReportComponent {
  private service = inject(RequestsService);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  // undefined = chargement, null = erreur (demande inconnue ou pas proposee a ce producteur...)
  request = toSignal(this.service.getDetail(this.id).pipe(catchError(() => of(null))));

  readonly reasons = REASONS;
  reason = signal('');
  message = signal('');
  sending = signal(false);
  sent = signal(false);
  error = signal('');

  // ex. "Demande de Camille R. · 20 kg · Lyon (69)"
  summary(request: RequestDetail): string {
    const place = request.city && request.department ? `${request.city} (${request.department})` : request.city;
    return [`Demande de ${request.clientName}`, request.quantity !== null ? requestQuantity(request, true) : null, place]
      .filter((part) => !!part)
      .join(' · ');
  }

  submit(): void {
    if (!this.reason()) {
      this.error.set('Choisissez un motif de signalement.');
      return;
    }

    this.error.set('');
    this.sending.set(true);
    this.service.reportRequest(this.id, { reason: this.reason(), message: this.message().trim() || null }).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.sending.set(false);
        this.error.set(err.error?.error ?? "Impossible d'envoyer le signalement pour le moment.");
      },
    });
  }
}
