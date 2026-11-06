import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ClientConversation } from './client-messages.model';

// la liste vient de la route du client ; lire un fil, ecrire et joindre un fichier passent par les routes communes aux deux
// roles (ConversationController), que le MessagesService de la messagerie producteur appelle deja
@Injectable({ providedIn: 'root' })
export class ClientMessagesService {
  private readonly http = inject(HttpClient);

  list(): Observable<ClientConversation[]> {
    return this.http.get<ClientConversation[]>(`${environment.apiURL}/client/conversations`);
  }
}
