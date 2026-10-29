import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { barPercent, money, monthLabel, percent } from './statistics-format';
import { Statistics, StatisticsService } from './statistics.service';

// page "Statistiques", branchee sur GET /api/producer/statistics (page Profil, bouton "Statistiques").
// La maquette montre quatre chiffres et le graphique des demandes recues --> on y ajoute "Reponses envoyees" et le cout par
// demande ("ROI estime"), deux autres chiffres du cahier fonctionnel (module Statistiques) que le back calcule deja.
// Les statistiques sont comprises dans les offres Pro (de base) et Premium (avancees) --> sans elles le back repond 403
// et la page le dit, avec un lien vers les abonnements. Le cahier ne dit pas ce que les avancees ajoutent, les deux
// niveaux voient donc la meme chose. Pas de maquette mobile : les chiffres passent sur deux colonnes
@Component({
  selector: 'app-producer-statistics',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './statistics.component.html',
})
export class StatisticsComponent {
  // undefined = chargement, 'locked' = l'offre n'a pas les statistiques, null = erreur (back injoignable...)
  private result = toSignal(
    inject(StatisticsService)
      .get()
      .pipe(catchError((err: HttpErrorResponse) => of(err.status === 403 ? ('locked' as const) : null))),
  );

  locked = computed(() => this.result() === 'locked');
  failed = computed(() => this.result() === null);
  stats = computed<Statistics | null>(() => {
    const result = this.result();
    return result && result !== 'locked' ? result : null;
  });

  // dans l'ordre de la maquette, puis les deux du cahier
  cards = computed(() => {
    const s = this.stats();
    if (!s) return [];

    return [
      { label: 'Vues du profil', value: String(s.profileViews) },
      { label: 'Demandes reçues', value: String(s.requestsReceived) },
      { label: 'Taux de réponse', value: percent(s.responseRate) },
      { label: 'Conversations', value: String(s.conversations) },
      { label: 'Réponses envoyées', value: String(s.replies) },
      { label: 'Coût par demande reçue', value: money(s.estimatedRoi.costPerRequestReceived, s.estimatedRoi.currency) },
    ];
  });

  // le dernier mois (le mois en cours) est en vert, les autres en gris
  bars = computed(() => {
    const months = this.stats()?.requestsByMonth ?? [];
    return months.map((m, i) => ({
      label: monthLabel(m.month),
      count: m.count,
      height: barPercent(m.count, months),
      current: i === months.length - 1,
    }));
  });

  hasRequests = computed(() => this.bars().some((bar) => bar.count > 0));
}
