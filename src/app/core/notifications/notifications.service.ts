import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// GET /api/notifications (type, title et body sont nullables en base, le back ne les force pas)
export interface AppNotification {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

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
