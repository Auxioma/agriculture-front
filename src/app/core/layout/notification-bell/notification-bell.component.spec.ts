import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppNotification, NotificationsService } from '../../notifications/notifications.service';
import { NotificationBellComponent } from './notification-bell.component';

// * heure figee en milieu de journee : « Il y a 3 h » et « Hier » ne doivent pas dependre de l'heure a laquelle tourne le test
const NOW = new Date(2026, 9, 26, 14, 0).getTime();
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

const note = (id: string, changes: Partial<AppNotification> = {}): AppNotification => ({
  id,
  type: 'new_message',
  title: `Titre ${id}`,
  body: `Texte ${id}`,
  readAt: null,
  createdAt: minutesAgo(10),
  ...changes,
});

// l'API renvoie les plus recentes d'abord
const LIST = [
  note('n1', { type: 'producer_replied', title: 'Un producteur a répondu', body: 'Vous avez une nouvelle réponse à votre demande.', createdAt: minutesAgo(10) }),
  note('n2', { title: 'Nouveau message', body: 'Vous avez reçu un nouveau message.', createdAt: minutesAgo(60 + 5) }),
  note('n3', { type: 'request_expiring_soon', title: 'Demande expirant bientôt', body: null, readAt: minutesAgo(30), createdAt: minutesAgo(3 * 60 + 5) }),
  note('n4', { type: 'profile_validated', title: 'Profil validé', readAt: minutesAgo(30), createdAt: minutesAgo(26 * 60) }),
];

describe('NotificationBellComponent', () => {
  let fixture: ComponentFixture<NotificationBellComponent>;
  let compiled: HTMLElement;
  let service: { latest: ReturnType<typeof vi.fn>; markAsRead: ReturnType<typeof vi.fn>; markAllAsRead: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => vi.useRealTimers());

  async function create(list$: Observable<AppNotification[]> = of(LIST)): Promise<void> {
    service = { latest: vi.fn(() => list$), markAsRead: vi.fn(() => of(null)), markAllAsRead: vi.fn(() => of(null)) };
    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent],
      // * la route existe pour que le clic sur « Voir toutes » aboutisse, sinon la navigation échoue après la fin du test
      providers: [provideRouter([{ path: 'notifications', children: [] }]), { provide: NotificationsService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  // les lignes du bloc texte sont des span block : textContent les colle, on les relit une par une
  const lines = (el: Element) => [...el.querySelectorAll('span.block')].map((line) => text(line));
  const bell = () => compiled.querySelector<HTMLButtonElement>('button[aria-controls=notification-card]')!;
  const badge = () => text(bell().querySelector('span[aria-hidden]'));
  const card = () => compiled.querySelector('#notification-card');
  const rows = () => [...compiled.querySelectorAll('#notification-card li')];
  const rowOf = (title: string) => rows().find((li) => li.textContent?.includes(title))!;
  const click = (el: HTMLElement) => {
    el.click();
    fixture.detectChanges();
  };
  const openCard = () => click(bell());
  const button = (label: string) => [...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);

  it('lit les notifications des la creation, sans ouvrir la card', async () => {
    await create();

    expect(service.latest).toHaveBeenCalledTimes(1);
    expect(card()).toBeNull();
  });

  it('compte les non lues sur la cloche et le dit aux lecteurs d ecran', async () => {
    await create();

    expect(badge()).toBe('2');
    expect(bell().getAttribute('aria-label')).toBe('Notifications, 2 non lues');
  });

  it('accorde « non lue » au singulier', async () => {
    await create(of([note('n1'), note('n2', { readAt: minutesAgo(1) })]));

    expect(bell().getAttribute('aria-label')).toBe('Notifications, 1 non lue');
  });

  it('n affiche pas de pastille quand tout est lu', async () => {
    await create(of(LIST.map((n) => ({ ...n, readAt: minutesAgo(1) }))));

    expect(badge()).toBeUndefined();
    expect(bell().getAttribute('aria-label')).toBe('Notifications');
  });

  it('plafonne la pastille a « 9+ »', async () => {
    await create(of(Array.from({ length: 12 }, (_, i) => note(`x${i}`))));

    expect(badge()).toBe('9+');
  });

  it('ouvre la card au clic sur la cloche et la referme au second clic', async () => {
    await create();

    openCard();
    expect(card()).not.toBeNull();
    expect(bell().getAttribute('aria-expanded')).toBe('true');
    expect(text(card()!.querySelector('h2'))).toBe('Notifications');

    click(bell());
    expect(card()).toBeNull();
    expect(bell().getAttribute('aria-expanded')).toBe('false');
    // * création + ouverture : la fermeture ne relit rien
    expect(service.latest).toHaveBeenCalledTimes(2);
  });

  it('montre titre, texte et ancienneté de chaque notification', async () => {
    await create();
    openCard();

    expect(lines(rowOf('Un producteur a répondu'))).toEqual(['Non lue : Un producteur a répondu', 'Vous avez une nouvelle réponse à votre demande.', 'Il y a 10 min']);
    expect(lines(rowOf('Nouveau message')).at(-1)).toBe('Il y a 1 h');
    // * sans texte : le titre et l'heure suffisent, pas de ligne vide
    expect(lines(rowOf('Demande expirant bientôt'))).toEqual(['Demande expirant bientôt', 'Il y a 3 h']);
    expect(lines(rowOf('Profil validé')).at(-1)).toBe('Hier');
  });

  it('distingue les non lues (fond vert, point) des lues', async () => {
    await create();
    openCard();

    const unread = rowOf('Un producteur a répondu');
    expect(unread.querySelector('button.bg-badge-bg')).not.toBeNull();
    expect(unread.querySelector('span.rounded-full.bg-agri.h-2')).not.toBeNull();

    const read = rowOf('Demande expirant bientôt');
    expect(read.querySelector('button')).toBeNull();
    expect(read.querySelector('span.h-2.w-2')).toBeNull();

    // * le rond de l'icone suit : plein vert pour une non lue, teinte pour une lue
    expect(unread.querySelector('span.h-8.bg-agri.text-white')).not.toBeNull();
    expect(read.querySelector('span.h-8.bg-badge-bg.text-agri')).not.toBeNull();
  });

  it('donne une icone differente selon le type', async () => {
    await create();
    openCard();

    const path = (title: string) => rowOf(title).querySelector('svg path')!.getAttribute('d');
    expect(new Set([path('Un producteur a répondu'), path('Nouveau message'), path('Demande expirant bientôt'), path('Profil validé')]).size).toBe(4);
  });

  it('n affiche que les plus récentes dans la card, et compte toutes les non lues sur la cloche', async () => {
    const many = [note('a'), note('b'), note('c'), note('d'), note('e'), note('f')];
    await create(of(many));
    openCard();

    expect(rows().map((li) => text(li.querySelector('span.font-bold')))).toEqual(['Non lue : Titre a', 'Non lue : Titre b', 'Non lue : Titre c', 'Non lue : Titre d']);
    expect(badge()).toBe('6');
  });

  it('marque une notification lue au clic, sans recharger', async () => {
    await create();
    openCard();

    click(rowOf('Un producteur a répondu').querySelector('button')!);

    expect(service.markAsRead).toHaveBeenCalledWith('n1');
    expect(rowOf('Un producteur a répondu').querySelector('button')).toBeNull();
    expect(badge()).toBe('1');
    expect(service.latest).toHaveBeenCalledTimes(2); // création + ouverture, pas le clic
  });

  it('ne rappelle pas le back pour une notification déjà lue', async () => {
    await create();

    fixture.componentInstance.read(LIST[2]);

    expect(service.markAsRead).not.toHaveBeenCalled();
  });

  it('efface l erreur affichée dès la prochaine action', async () => {
    await create();
    openCard();
    service.markAsRead.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404, error: { error: 'Notification introuvable.' } })));
    click(rowOf('Un producteur a répondu').querySelector('button')!);
    expect(compiled.querySelector('[role=alert]')).not.toBeNull();

    click(rowOf('Nouveau message').querySelector('button')!);

    expect(compiled.querySelector('[role=alert]')).toBeNull();
  });

  it('garde la notification non lue et dit pourquoi quand le back refuse', async () => {
    await create();
    openCard();
    service.markAsRead.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404, error: { error: 'Notification introuvable.' } })));

    click(rowOf('Un producteur a répondu').querySelector('button')!);

    expect(compiled.querySelector('[role=alert]')?.textContent).toContain('Notification introuvable.');
    expect(rowOf('Un producteur a répondu').querySelector('button')).not.toBeNull();
    expect(badge()).toBe('2');
  });

  it('marque tout comme lu, puis retire le lien et la pastille', async () => {
    await create();
    openCard();

    click(button('Tout marquer comme lu')!);

    expect(service.markAllAsRead).toHaveBeenCalledTimes(1);
    expect(badge()).toBeUndefined();
    expect(button('Tout marquer comme lu')).toBeUndefined();
    expect(compiled.querySelectorAll('#notification-card li button')).toHaveLength(0);
    // * elles restent dans la liste, lues
    expect(rows()).toHaveLength(4);
  });

  it('ne propose pas « Tout marquer comme lu » quand rien n est à lire', async () => {
    await create(of(LIST.map((n) => ({ ...n, readAt: minutesAgo(1) }))));
    openCard();

    expect(button('Tout marquer comme lu')).toBeUndefined();
  });

  it('garde les non lues non lues et le dit quand « tout marquer comme lu » échoue', async () => {
    await create();
    openCard();
    service.markAllAsRead.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500, error: {} })));

    click(button('Tout marquer comme lu')!);

    expect(compiled.querySelector('[role=alert]')?.textContent).toContain('Action impossible pour le moment.');
    expect(badge()).toBe('2');
  });

  it('propose de voir toutes les notifications, et referme la card en y allant', async () => {
    await create();
    openCard();

    const link = compiled.querySelector<HTMLAnchorElement>('#notification-card a')!;
    expect(text(link)).toBe('Voir toutes les notifications');
    expect(link.getAttribute('href')).toBe('/notifications');

    click(link);
    expect(card()).toBeNull();
  });

  it('dit qu il n y a rien, sans lien, quand la liste est vide', async () => {
    await create(of([]));
    openCard();

    expect(text(card())).toContain('Aucune notification pour le moment.');
    expect(card()!.querySelector('a')).toBeNull();
    expect(button('Tout marquer comme lu')).toBeUndefined();
    expect(badge()).toBeUndefined();
  });

  it('dit quand les notifications ne se chargent pas, sans casser la cloche', async () => {
    await create(throwError(() => new HttpErrorResponse({ status: 500 })));
    openCard();

    expect(text(card())).toContain('Impossible de charger vos notifications.');
    expect(card()!.querySelector('li')).toBeNull();
    expect(badge()).toBeUndefined();
  });

  it('relit les notifications à chaque ouverture et affiche les nouvelles', async () => {
    await create(of([note('n1')]));
    service.latest.mockReturnValueOnce(of([note('n9', { title: 'Toute neuve' }), note('n1')]));

    openCard();

    expect(service.latest).toHaveBeenCalledTimes(2);
    expect(rowOf('Toute neuve')).toBeDefined();
    expect(badge()).toBe('2');
  });

  it('garde la liste déjà là quand une relecture échoue', async () => {
    await create(of(LIST));
    service.latest.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));

    openCard();

    expect(rows()).toHaveLength(4);
    expect(text(card())).not.toContain('Impossible de charger');
  });

  it('demande les vingt dernières, pas tout l historique', async () => {
    await create();

    expect(service.latest).toHaveBeenCalledWith(20);
  });

  it('referme la card au clic ailleurs dans la page, pas dedans', async () => {
    await create();
    openCard();

    click(card()!.querySelector('h2')!);
    expect(card()).not.toBeNull();

    document.body.click();
    fixture.detectChanges();
    expect(card()).toBeNull();
  });

  it('referme la card avec Échap', async () => {
    await create();
    openCard();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(card()).toBeNull();
  });
});
