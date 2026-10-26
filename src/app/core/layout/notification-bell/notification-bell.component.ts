import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { messageOf } from '../../../features/producer/message-of';
import { AppNotification, NotificationsService } from '../../notifications/notifications.service';
import { iconOf, timeAgo } from '../../notifications/notification-format';

// card sous la cloche (semblable au figma) : les plus recentes, les non lues sur fond vert avec un point.
// "Voir toutes les notifications" mene a /notifications, page qui n'existe pas encore (pas de maquette).
// Cliquer une notification la marque lue, sans aller nulle part : le back ne donne pas de destination (pas de requestId, etc.)
//
// Seulement pour un utilisateur connecte : la navbar ne l'affiche pas autrement, donc rien n'est demande au back pour un invite
// ni cote serveur (SSR : pas de connexion la-bas).

// montrees dans la card
const CARD_SIZE = 4;
// lues d'un coup : assez pour compter les non lues de la cloche sans tout rapatrier
const FETCHED = 20;
// au dela, la pastille dit "9+"
const BADGE_MAX = 9;

type State = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './notification-bell.component.html',
})
export class NotificationBellComponent {
  private service = inject(NotificationsService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  open = signal(false);
  state = signal<State>('loading');
  actionError = signal<string | null>(null);
  private items = signal<AppNotification[]>([]);
  // * l'heure sert aux "Il y a 10 min" : fixee a chaque lecture, pas recalculee a chaque affichage
  private now = signal(Date.now());

  unread = computed(() => this.items().filter((n) => !n.readAt).length);
  badge = computed(() => (this.unread() > BADGE_MAX ? `${BADGE_MAX}+` : String(this.unread())));
  rows = computed(() =>
    this.items()
      .slice(0, CARD_SIZE)
      .map((n) => ({ n, unread: !n.readAt, icon: iconOf(n.type), time: timeAgo(n.createdAt, this.now()) })),
  );
  hasAny = computed(() => this.items().length > 0);

  constructor() {
    this.refresh();
  }

  toggle(): void {
    this.open.update((open) => !open);
    // --> a l'ouverture on relit : la liste affichee reste en place pendant ce temps, pas de page blanche
    if (this.open()) this.refresh();
  }

  close(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  read(notification: AppNotification): void {
    if (notification.readAt) return;
    this.actionError.set(null);
    this.service.markAsRead(notification.id).subscribe({
      next: () => this.items.update((list) => list.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n))),
      error: (err: HttpErrorResponse) => this.actionError.set(messageOf(err)),
    });
  }

  readAll(): void {
    this.actionError.set(null);
    this.service.markAllAsRead().subscribe({
      next: () => this.items.update((list) => list.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))),
      error: (err: HttpErrorResponse) => this.actionError.set(messageOf(err)),
    });
  }

  private refresh(): void {
    this.service.latest(FETCHED).subscribe({
      next: (list) => {
        this.items.set(list);
        this.now.set(Date.now());
        this.state.set('ready');
      },
      // une relecture qui echoue garde la liste deja la ; l'erreur ne se montre que s'il n'y a rien du tout
      error: () => this.state.update((state) => (state === 'ready' ? state : 'error')),
    });
  }
}
