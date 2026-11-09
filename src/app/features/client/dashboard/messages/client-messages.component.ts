import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { listTime, previewText } from '../../../producer/messages/messages-format';
import { initials } from '../../utils/initials';
import { ClientConversation } from './client-messages.model';
import { ClientMessagesStore } from './client-messages-store';
import { conversationTime, matches } from './client-messages-format';

// messagerie du client, branchee sur GET /api/client/conversations (cahier : "Messages - inbox par demande, recherche, non lus").
// Desktop : la liste a gauche et le fil ouvert a droite. Mobile : la liste, puis le fil a la place de la liste. Le fil est une route
// fille (/client/messages/:id) rendue dans la sortie de droite. La recherche se fait dans le navigateur.
@Component({
  selector: 'app-client-messages',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  providers: [ClientMessagesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-messages.component.html',
})
export class ClientMessagesComponent {
  private readonly store = inject(ClientMessagesStore);

  // undefined = chargement, null = erreur
  readonly conversations = this.store.conversations;
  readonly query = signal('');
  // un fil est ouvert : en mobile il prend la place de la liste
  readonly open = signal(false);

  readonly visible = computed(() =>
    (this.conversations() ?? []).filter((c) => matches(c, this.query())),
  );

  readonly initials = initials;
  readonly preview = previewText;

  time(c: ClientConversation): string {
    const iso = conversationTime(c);
    return iso ? listTime(iso) : '';
  }
}
