import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { destinationFor, iconOf, timeAgo } from '../../core/notifications/notification-format';
import { NotificationItemComponent, NotificationRow } from '../../core/notifications/notification-item.component';
import { AppNotification, NotificationsService } from '../../core/notifications/notifications.service';
import { LoadMoreComponent } from '../../core/layout/load-more/load-more.component';
import { hasMore } from '../../core/http/paged';
import { PageSkeletonComponent } from '../../core/layout/page-skeleton/page-skeleton.component';
import { messageOf } from '../producer/message-of';

// page "Notifications" : ce vers quoi mene "Voir toutes les notifications" de la cloche. Pas de maquette : elle reprend les lignes de la card
// de la cloche, avec un filtre "Non lues" et "Tout marquer comme lu". Deux adresses, un seul composant : /notifications (site public,
// utilisateur connecte) et /producer/notifications (dans l'espace producteur, pour ne pas en sortir).
// L'historique par pages (« Voir plus » charge la suivante, le back donne le total). Une notification qui mene quelque part
// (voir destinationFor) est un lien qui la marque lue en passant.

const PAGE_SIZE = 20;

type Filter = 'all' | 'unread';
type State = 'loading' | 'ready' | 'error';

const CHIP = 'shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [RouterLink, NotificationItemComponent, PageSkeletonComponent, LoadMoreComponent],
  templateUrl: './notifications-page.component.html',
})
export class NotificationsPageComponent {
  private service = inject(NotificationsService);
  private user = inject(AuthService).currentUser;

  state = signal<State>('loading');
  filter = signal<Filter>('all');
  actionError = signal<string | null>(null);
  // le total de toutes les pages (null : le back ne l'a pas donne, la liste recue est entiere), les pages deja lues
  serverTotal = signal<number | null>(null);
  private pagesLoaded = 1;
  loadingMore = signal(false);
  moreFailed = signal(false);

  private items = signal<AppNotification[]>([]);
  // l'heure sert aux "Il y a 10 min" : fixee a chaque lecture, pas recalculee a chaque affichage
  private now = signal(Date.now());

  loaded = computed(() => this.items().length);
  unread = computed(() => this.items().filter((n) => !n.readAt).length);
  // les non lues des pages deja chargees : « 3+ » tant qu'il en reste d'autres a charger
  unreadLabel = computed(() => `${this.unread()}${hasMore(this.loaded(), this.serverTotal()) ? '+' : ''}`);

  rows = computed<NotificationRow[]>(() => {
    const roles = this.user()?.roles;

    return this.items()
      .filter((n) => this.filter() === 'all' || !n.readAt)
      .map((n) => ({ n, unread: !n.readAt, icon: iconOf(n.type), time: timeAgo(n.createdAt, this.now()), link: destinationFor(roles, n.type, n.data) }));
  });

  constructor() {
    this.service.page(1, PAGE_SIZE).subscribe({
      next: ({ items, total }) => {
        this.items.set(items);
        this.serverTotal.set(total);
        this.now.set(Date.now());
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  loadMore(): void {
    if (this.loadingMore()) return;
    this.loadingMore.set(true);
    this.moreFailed.set(false);
    this.service.page(this.pagesLoaded + 1, PAGE_SIZE).subscribe({
      next: ({ items, total }) => {
        // une notification arrivee entre-temps decale les pages : celles deja affichees ne se repetent pas
        const known = new Set(this.items().map((n) => n.id));
        this.items.update((list) => [...list, ...items.filter((n) => !known.has(n.id))]);
        this.serverTotal.set(total);
        this.pagesLoaded++;
        this.now.set(Date.now());
        this.loadingMore.set(false);
      },
      error: () => {
        this.moreFailed.set(true);
        this.loadingMore.set(false);
      },
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
