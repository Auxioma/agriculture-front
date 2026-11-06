import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { conversationTime, initials, listTime, matches, previewText } from './messages-format';
import { MessagesStore } from './messages-store';
import { ProducerConversation } from './messages.model';

// messagerie du producteur (semblable au figma), branchee sur GET /api/producer/conversations. Desktop : la liste a
// gauche et le fil ouvert a droite (chat en colonnes, cahier). Mobile : la liste, puis le fil a la place de la liste.
// Le fil est une route fille (/producer/messages/:id) rendue dans la sortie de droite. La recherche se fait dans le
// navigateur, sur le nom, le produit et le dernier message.
// "Discuter avec le client" (detail d'un devis) arrive ici avec ?request=<id de la demande> : on ouvre le fil de
// cette demande des que la liste est chargee.
@Component({
  selector: 'app-producer-messages',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  providers: [MessagesStore],
  templateUrl: './messages.component.html',
})
export class MessagesComponent {
  private router = inject(Router);
  private store = inject(MessagesStore);
  private requestToOpen = inject(ActivatedRoute).snapshot.queryParamMap.get('request');

  // undefined = chargement, null = erreur
  readonly conversations = this.store.conversations;
  query = signal('');
  // un fil est ouvert : en mobile il prend la place de la liste
  open = signal(false);

  visible = computed(() => (this.conversations() ?? []).filter((c) => matches(c, this.query())));

  constructor() {
    effect(() => {
      const list = this.conversations();
      if (!this.requestToOpen || !list) return;

      const target = list.find((c) => c.requestId === this.requestToOpen);
      this.requestToOpen = null;
      this.router.navigate(target ? ['/producer/messages', target.id] : ['/producer/messages'], { replaceUrl: true });
    });
  }

  readonly initials = initials;
  readonly preview = previewText;

  time(c: ProducerConversation): string {
    const iso = conversationTime(c);
    return iso ? listTime(iso) : '';
  }
}
