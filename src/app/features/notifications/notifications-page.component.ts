import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { iconOf, producerDestination, timeAgo } from '../../core/notifications/notification-format';
import { NotificationItemComponent, NotificationRow } from '../../core/notifications/notification-item.component';
import { AppNotification, NotificationsService } from '../../core/notifications/notifications.service';
import { PageSkeletonComponent } from '../../core/layout/page-skeleton/page-skeleton.component';
import { messageOf } from '../producer/message-of';
import { hasProducerRole } from '../producer/producer-role';

// page "Notifications" : ce vers quoi mene "Voir toutes les notifications" de la cloche. Pas de maquette : elle reprend les lignes de la card
// de la cloche, avec un filtre "Non lues" et "Tout marquer comme lu". Deux adresses, un seul composant : /notifications (site public,
// utilisateur connecte) et /producer/notifications (dans l'espace producteur, pour ne pas en sortir).
// Les 100 dernieres : c'est le plafond de `limit` cote back, qui n'a pas de pagination. Une notification qui mene quelque part
// (producteur seulement, voir producerDestination) est un lien qui la marque lue en passant.

// plafond du back pour `limit`
const FETCHED = 100;

type Filter = 'all' | 'unread';
type State = 'loading' | 'ready' | 'error';

const CHIP = 'shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [RouterLink, NotificationItemComponent, PageSkeletonComponent],
  templateUrl: './notifications-page.component.html',
})
export class NotificationsPageComponent {
  private service = inject(NotificationsService);
  private user = inject(AuthService).currentUser;

  state = signal<State>('loading');
  filter = signal<Filter>('all');
  actionError = signal<string | null>(null);
  readonly limit = FETCHED;

  private items = signal<AppNotification[]>([]);
  // l'heure sert aux "Il y a 10 min" : fixee a chaque lecture, pas recalculee a chaque affichage
  private now = signal(Date.now());

  total = computed(() => this.items().length);
  unread = computed(() => this.items().filter((n) => !n.readAt).length);

  rows = computed<NotificationRow[]>(() => {
    const user = this.user();
    const destination = user && hasProducerRole(user.roles) ? producerDestination : () => null;

    return this.items()
      .filter((n) => this.filter() === 'all' || !n.readAt)
      .map((n) => ({ n, unread: !n.readAt, icon: iconOf(n.type), time: timeAgo(n.createdAt, this.now()), link: destination(n.type) }));
  });

  constructor() {
    this.service.latest(FETCHED).subscribe({
      next: (list) => {
        this.items.set(list);
        this.now.set(Date.now());
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  chip(active: boolean): string {
    return `${CHIP} ${active ? 'border-agri bg-agri text-white' : 'border-grey-400 bg-white text-grey-700'}`;
  }

  read(notification: AppNotification): void {
    if (notification.readAt) return;
    this.actionError.set(null);
    this.service.markAsRead(notification.id).subscribe({
      next: () => {
        this.items.update((list) => list.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n)));
        this.service.announceChange();
      },
      error: (err: HttpErrorResponse) => this.actionError.set(messageOf(err)),
    });
  }

  readAll(): void {
    this.actionError.set(null);
    this.service.markAllAsRead().subscribe({
      next: () => {
        this.items.update((list) => list.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
        this.service.announceChange();
      },
      error: (err: HttpErrorResponse) => this.actionError.set(messageOf(err)),
    });
  }
}
