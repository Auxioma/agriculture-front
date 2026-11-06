import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

// GET /api/notifications (type, title et body sont nullables en base, le back ne les force pas)
export interface AppNotification {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  // ce que le back y a mis pour retrouver l'objet (requestId, conversationId...), selon le type ; vide sinon
  data?: Record<string, unknown> | unknown[] | null;
  readAt: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;
  private changed = new Subject<void>();

  // la page des notifications annonce qu'elle a marque des notifications lues : la cloche, qui garde sa propre liste, la relit.
  // La cloche ne s'annonce pas elle-meme (elle a deja mis sa liste a jour)
  readonly changes$ = this.changed.asObservable();

  announceChange(): void {
    this.changed.next();
  }

  // les plus recentes d'abord ; sans limit le back renvoie tout l'historique
  latest(limit: number) {
    return this.http.get<AppNotification[]>(`${this.apiUrl}/notifications`, { params: { limit } });
  }

  markAsRead(id: string) {
    return this.http.post<null>(`${this.apiUrl}/notifications/${id}/read`, {});
  }

  markAllAsRead() {
    return this.http.post<null>(`${this.apiUrl}/notifications/read-all`, {});
  }
}
