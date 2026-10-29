import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

// un mois du graphique : "2026-08" et le nombre de demandes mises en relation ce mois-la
export interface MonthCount {
  month: string;
  count: number;
}

// GET /api/producer/statistics. Reserve aux offres qui comprennent les statistiques : sinon le back repond 403
export interface Statistics {
  profileViews: number;
  requestsReceived: number;
  replies: number;
  conversations: number;
  // en pourcentage, null tant qu'aucune demande n'est arrivee
  responseRate: number | null;
  // les 6 derniers mois, du plus ancien au mois en cours, un mois sans demande compte 0
  requestsByMonth: MonthCount[];
  // le back ne connait jamais le montant d'une vente : ce "ROI" est le prix de l'abonnement divise par ce qu'il a rapporte
  // en demandes et en conversations, null sans abonnement actif (essai...)
  estimatedRoi: {
    currency: string | null;
    subscriptionCost: number | null;
    costPerRequestReceived: number | null;
    costPerConversationOpened: number | null;
  };
}

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  get() {
    return this.http.get<Statistics>(`${this.apiUrl}/producer/statistics`);
  }
}
