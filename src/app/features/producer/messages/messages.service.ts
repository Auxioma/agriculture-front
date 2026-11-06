import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ProducerConversation, Thread } from './messages.model';

// la liste vient de la route du producteur ; lire un fil, ecrire, joindre et signaler passent par les routes
// communes aux deux roles (ConversationController), le client s'en sert aussi
@Injectable({ providedIn: 'root' })
export class MessagesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  list() {
    return this.http.get<ProducerConversation[]>(`${this.apiUrl}/producer/conversations`);
  }

  thread(id: string) {
    return this.http.get<Thread>(`${this.apiUrl}/conversations/${id}`);
  }

  send(id: string, content: string) {
    return this.http.post<{ id: string }>(`${this.apiUrl}/conversations/${id}/messages`, { content });
  }

  // le texte, s'il y en a un, part avec le fichier comme legende
  attach(id: string, file: File, caption: string) {
    const body = new FormData();
    body.append('file', file);
    if (caption) body.append('content', caption);
    return this.http.post<{ id: string; attachmentId: string }>(`${this.apiUrl}/conversations/${id}/attachments`, body);
  }

  report(id: string, payload: { reason: string; message: string | null }) {
    return this.http.post<{ id: string }>(`${this.apiUrl}/conversations/${id}/report`, payload);
  }
}
