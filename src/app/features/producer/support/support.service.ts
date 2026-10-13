import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

// open, in_progress, resolved ou closed : poses par l'equipe depuis l'admin (Tickets)
export interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SupportService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getTickets() {
    return this.http.get<SupportTicket[]>(`${this.apiUrl}/support/tickets`);
  }

  // le message devient le premier message du ticket
  createTicket(subject: string, content: string) {
    return this.http.post<{ id: string }>(`${this.apiUrl}/support/tickets`, { subject, content });
  }
}
