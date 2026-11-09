import { Component, input } from '@angular/core';
import { AppNotification } from './notifications.service';

// ce qu'il faut pour afficher une notification : la notification, son etat, son icone, son anciennete et, pour un producteur,
// la page ou elle mene (selon son type)
export interface NotificationRow {
  n: AppNotification;
  unread: boolean;
  icon: string;
  time: string;
  link: string | null;
}

// une ligne de notification : icone, titre, texte, anciennete et point des non lues. Dans la card de la cloche et sur la page des
// notifications. display: contents pour que l'icone, le texte et le point restent des enfants directs du bouton, du lien ou du bloc
// qui l'entoure (c'est lui qui les met en ligne)
@Component({
  selector: 'app-notification-item',
  standalone: true,
  host: { class: 'contents' },
  template: `
    <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" [class]="row().unread ? 'bg-agri text-white' : 'bg-badge-bg text-agri'">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
        <path [attr.d]="row().icon"></path>
      </svg>
    </span>
    <span class="min-w-0 flex-1">
      <span class="block text-sm font-bold text-fonts">
        @if (row().unread) {
          <span class="sr-only">Non lue : </span>
        }
        {{ row().n.title }}
      </span>
      @if (row().n.body) {
        <span class="mt-0.5 block text-xs text-grey-700">{{ row().n.body }}</span>
      }
      <span class="mt-1 block text-xs text-grey-700">{{ row().time }}</span>
    </span>
    @if (row().unread) {
      <span aria-hidden="true" class="mt-2 h-2 w-2 shrink-0 rounded-full bg-agri"></span>
    }
  `,
})
export class NotificationItemComponent {
  readonly row = input.required<NotificationRow>();
}
