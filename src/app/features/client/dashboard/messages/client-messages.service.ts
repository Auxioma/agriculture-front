import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ClientConversation } from './client-messages.model';
import { getAllPages } from '../../../../core/http/paged';

// la liste vient de la route du client ; lire un fil, ecrire et joindre un fichier passent par les routes communes aux deux
// roles (ConversationController), que le MessagesService de la messagerie producteur appelle deja
// cent par requete, le plafond du back : ces listes sont paginees (vingt par defaut), l'ecran les veut entieres pour filtrer ou chercher
const PAGE_SIZE = 100;

@Injectable({ providedIn: 'root' })
export class ClientMessagesService {
  private readonly http = inject(HttpClient);

  list(): Observable<ClientConversation[]> {
    return getAllPages<ClientConversation>(this.http, `${environment.apiURL}/client/conversations`, { pageSize: PAGE_SIZE });
  }
}
