import { Component, ElementRef, HostListener, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { messageOf } from '../../../features/producer/message-of';
import { hasProducerRole } from '../../../features/producer/producer-role';
import { AuthService } from '../../auth/auth.service';
import { AppNotification, NotificationsService } from '../../notifications/notifications.service';
import { NotificationItemComponent, NotificationRow } from '../../notifications/notification-item.component';
import { iconOf, producerDestination, timeAgo } from '../../notifications/notification-format';

// card sous la cloche (semblable au figma) : les plus recentes, les non lues sur fond vert avec un point.
// "Voir toutes les notifications" mene a la page des notifications (/notifications, ou /producer/notifications dans l'espace producteur).
// Cliquer une notification la marque lue ; pour un producteur elle mene en plus a la section de son espace qui la concerne, d'apres son
// type (le back ne donne pas d'identifiant, pas de requestId, etc.). Pour un client elle ne mene nulle part : a son cote de le dire.
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
  imports: [RouterLink, NotificationItemComponent],
  templateUrl: './notification-bell.component.html',
})
export class NotificationBellComponent {
  private service = inject(NotificationsService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private user = inject(AuthService).currentUser;

  // desktop : le bord de la cloche sur lequel la card s'aligne. "right" sous la navbar du site (la cloche est a droite de la page),
  // "left" pour une cloche dans une barre laterale, a gauche de la page : la card s'ouvre alors vers la droite
  readonly anchor = input<'right' | 'left'>('right');
  // l'adresse de la page "Voir toutes les notifications" ; null pour ne pas proposer le lien
  readonly allLink = input<string | null>('/notifications');

  open = signal(false);
  state = signal<State>('loading');
  actionError = signal<string | null>(null);
  private items = signal<AppNotification[]>([]);
  // * l'heure sert aux "Il y a 10 min" : fixee a chaque lecture, pas recalculee a chaque affichage
  private now = signal(Date.now());

  unread = computed(() => this.items().filter((n) => !n.readAt).length);
  badge = computed(() => (this.unread() > BADGE_MAX ? `${BADGE_MAX}+` : String(this.unread())));
  // seul un producteur a des destinations (voir producerDestination)
  private destination = computed(() => {
    const user = this.user();
    return user && hasProducerRole(user.roles) ? producerDestination : () => null;
  });
  rows = computed<NotificationRow[]>(() =>
    this.items()
      .slice(0, CARD_SIZE)
      .map((n) => ({ n, unread: !n.readAt, icon: iconOf(n.type), time: timeAgo(n.createdAt, this.now()), link: this.destination()(n.type) })),
  );
  hasAny = computed(() => this.items().length > 0);

  constructor() {
    this.refresh();
    // la page des notifications a marque des notifications lues : on relit la liste
    this.service.changes$.pipe(takeUntilDestroyed()).subscribe(() => this.refresh());
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

  // un clic sur une notification qui mene quelque part : elle est lue et la card se referme (la navigation se fait par le lien)
  follow(row: NotificationRow): void {
    this.read(row.n);
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
