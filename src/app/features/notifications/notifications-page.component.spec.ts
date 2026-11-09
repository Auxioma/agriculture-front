import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, map, of, throwError, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { AppNotification, NotificationsService } from '../../core/notifications/notifications.service';
import { NotificationsPageComponent } from './notifications-page.component';

// heure figee en milieu de journee : « Il y a 3 h » et « Hier » ne dependent pas de l'heure a laquelle tourne le test
const NOW = new Date(2026, 10, 3, 14, 0).getTime();
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

const LIST = [
  note('n1', { type: 'new_message', title: 'Nouveau message', body: 'Camille vous a écrit.', createdAt: minutesAgo(10) }),
  note('n2', { type: 'new_review', title: 'Nouvel avis', body: 'Un client vous a laissé 5 étoiles.', createdAt: minutesAgo(65) }),
  note('n3', { type: 'request_expiring_soon', title: 'Demande expirant bientôt', body: null, readAt: minutesAgo(30), createdAt: minutesAgo(3 * 60 + 5) }),
  note('n4', { type: 'profile_validated', title: 'Profil validé', readAt: minutesAgo(30), createdAt: minutesAgo(26 * 60) }),
];

describe('NotificationsPageComponent', () => {
  let fixture: ComponentFixture<NotificationsPageComponent>;
  let compiled: HTMLElement;
  let service: Record<'page' | 'markAsRead' | 'markAllAsRead' | 'announceChange', ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => vi.useRealTimers());

  // roles : ceux de l'utilisateur connecte ; null = personne
  // total : celui que le back annonce pour toutes les pages (null = liste entiere recue)
  async function create(list$: Observable<AppNotification[]> = of(LIST), roles: string[] | null = ['ROLE_ADMIN'], total: number | null = null): Promise<void> {
    service = { page: vi.fn(() => list$.pipe(map((items) => ({ items, total })))), markAsRead: vi.fn(() => of(null)), markAllAsRead: vi.fn(() => of(null)), announceChange: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [NotificationsPageComponent],
      providers: [
        provideRouter([{ path: 'producer', children: [{ path: '**', children: [] }] }]),
        { provide: NotificationsService, useValue: service },
        { provide: AuthService, useValue: { currentUser: signal(roles ? { roles } : null) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsPageComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const rows = () => [...compiled.querySelectorAll('ul > li')];
  const rowOf = (title: string) => rows().find((li) => li.textContent?.includes(title))!;
  const button = (label: string) => [...compiled.querySelectorAll('button')].find((b) => text(b)?.startsWith(label));
  const click = (el: HTMLElement) => {
    el.click();
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('liste toutes les notifications, de la plus récente à la plus ancienne, avec titre, texte et ancienneté', async () => {
    await create();

    expect(rows().length).toBe(4);
    expect(text(rows()[0])).toContain('Non lue : Nouveau message');
    expect(text(rows()[0])).toContain('Camille vous a écrit.');
    expect(text(rows()[0])).toContain('Il y a 10 min');
    expect(text(rows()[3])).toContain('Profil validé');
    expect(text(rows()[3])).toContain('Hier');
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Notifications');
  });

  it('demande la première page, vingt par vingt', async () => {
    await create();

    expect(service.page).toHaveBeenCalledWith(1, 20);
  });

  it('compte les non lues sur le filtre', async () => {
    await create();

    expect(text(button('Non lues'))).toBe('Non lues (2)');
    expect(button('Toutes')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('le filtre « Non lues » ne garde que les non lues, « Toutes » les rend toutes', async () => {
    await create();

    click(button('Non lues')!);
    expect(rows().length).toBe(2);
    expect(rows().map((li) => text(li))).toEqual([expect.stringContaining('Nouveau message'), expect.stringContaining('Nouvel avis')]);
    expect(button('Non lues')!.getAttribute('aria-pressed')).toBe('true');

    click(button('Toutes')!);
    expect(rows().length).toBe(4);
  });

  it('dit que tout est lu quand le filtre ne garde rien, et qu’il n’y a rien quand la liste est vide', async () => {
    await create(of(LIST.map((n) => ({ ...n, readAt: minutesAgo(1) }))));
    click(button('Non lues')!);
    expect(text(compiled)).toContain('Vous avez tout lu.');
    expect(button('Tout marquer comme lu')).toBeUndefined();

    TestBed.resetTestingModule();
    await create(of([]));
    expect(text(compiled)).toContain('Aucune notification pour le moment.');
  });

  it('prévient quand les notifications ne se chargent pas, sans filtre ni liste', async () => {
    await create(throwError(() => new HttpErrorResponse({ status: 500 })));

    expect(text(compiled.querySelector('[role=alert]'))).toBe('Impossible de charger vos notifications pour le moment.');
    expect(rows()).toEqual([]);
    expect(button('Toutes')).toBeUndefined();
  });

  describe('pages', () => {
    const more = () => [...compiled.querySelectorAll('app-load-more button')].find((b) => text(b) === 'Voir plus') as HTMLElement | undefined;

    it('propose « Voir plus » quand le back annonce plus de notifications que chargées, pas sinon', async () => {
      await create(of(LIST), ['ROLE_ADMIN'], 45);
      expect(more()).toBeDefined();
      expect(text(compiled)).toContain('4 sur 45');

      TestBed.resetTestingModule();
      await create(of(LIST), ['ROLE_ADMIN'], 4);
      expect(more()).toBeUndefined();

      TestBed.resetTestingModule();
      await create();
      expect(more()).toBeUndefined();
    });

    it('charge la page suivante et la met à la suite, sans répéter une notification déjà affichée', async () => {
      await create(of(LIST), ['ROLE_ADMIN'], 6);
      service.page.mockReturnValue(of({ items: [note('n4'), note('n5'), note('n6')], total: 6 }));

      click(more()!);

      expect(service.page).toHaveBeenLastCalledWith(2, 20);
      expect(rows().map((li) => text(li))).toEqual(expect.arrayContaining([expect.stringContaining('Titre n5'), expect.stringContaining('Titre n6')]));
      expect(rows().length).toBe(6);
      expect(more()).toBeUndefined();
    });

    it('dit que la suite ne se charge pas, en gardant la liste et le bouton', async () => {
      await create(of(LIST), ['ROLE_ADMIN'], 45);
      service.page.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      click(more()!);

      expect(text(compiled.querySelector('app-load-more [role=alert]'))).toContain('Impossible de charger la suite');
      expect(rows().length).toBe(4);
      expect(more()).toBeDefined();
    });

    it('compte les non lues « 2+ » tant que des pages restent à charger', async () => {
      await create(of(LIST), ['ROLE_ADMIN'], 45);

      expect(text(button('Non lues'))).toBe('Non lues (2+)');
    });
  });

  describe('marquer comme lu', () => {
    it('une notification non lue se marque lue au clic, et le dit à la cloche', async () => {
      await create();

      click(rowOf('Nouveau message').querySelector('button')!);

      expect(service.markAsRead).toHaveBeenCalledWith('n1');
      expect(service.announceChange).toHaveBeenCalledTimes(1);
      expect(rowOf('Nouveau message').querySelector('button')).toBeNull();
      expect(text(button('Non lues'))).toBe('Non lues (1)');
    });

    it('une notification déjà lue n’est pas un bouton et ne rappelle pas le back', async () => {
      await create();

      expect(rowOf('Profil validé').querySelector('button')).toBeNull();
      expect(service.markAsRead).not.toHaveBeenCalled();
    });

    it('garde la notification non lue et dit pourquoi quand le back refuse', async () => {
      await create();
      service.markAsRead.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Action impossible pour le moment.' } })));

      click(rowOf('Nouveau message').querySelector('button')!);

      expect(text(compiled.querySelector('[role=alert]'))).toBe('Action impossible pour le moment.');
      expect(rowOf('Nouveau message').querySelector('button')).toBeTruthy();
      expect(service.announceChange).not.toHaveBeenCalled();
    });

    it('« Tout marquer comme lu » marque tout lu, le dit à la cloche et disparaît', async () => {
      await create();

      click(button('Tout marquer comme lu')!);

      expect(service.markAllAsRead).toHaveBeenCalledTimes(1);
      expect(service.announceChange).toHaveBeenCalledTimes(1);
      expect(text(button('Non lues'))).toBe('Non lues (0)');
      expect(button('Tout marquer comme lu')).toBeUndefined();
      expect(compiled.querySelectorAll('ul button').length).toBe(0);
    });

    it('garde les non lues non lues et le dit quand « Tout marquer comme lu » échoue', async () => {
      await create();
      service.markAllAsRead.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      click(button('Tout marquer comme lu')!);

      expect(compiled.querySelector('[role=alert]')).toBeTruthy();
      expect(text(button('Non lues'))).toBe('Non lues (2)');
      expect(service.announceChange).not.toHaveBeenCalled();
    });
  });

  describe('destination par type', () => {
    const linkOf = (title: string) => rowOf(title).querySelector('a')?.getAttribute('href') ?? null;

    it('pour un producteur, chaque notification mène à la section de son espace qui la concerne', async () => {
      await create(of(LIST), ['ROLE_PRODUCER']);

      expect(linkOf('Nouveau message')).toBe('/producer/messages');
      expect(linkOf('Nouvel avis')).toBe('/producer/profile/reviews');
      expect(linkOf('Demande expirant bientôt')).toBe('/producer/requests');
      expect(linkOf('Profil validé')).toBe('/producer/profile');
    });

    it('suivre le lien d’une non lue la marque lue et le dit à la cloche', async () => {
      await create(of(LIST), ['ROLE_PRODUCER']);

      click(rowOf('Nouvel avis').querySelector('a')!);

      expect(service.markAsRead).toHaveBeenCalledWith('n2');
      expect(service.announceChange).toHaveBeenCalledTimes(1);
    });

    it('suivre le lien d’une notification déjà lue ne rappelle pas le back', async () => {
      await create(of(LIST), ['ROLE_PRODUCER']);

      click(rowOf('Profil validé').querySelector('a')!);

      expect(service.markAsRead).not.toHaveBeenCalled();
      expect(service.announceChange).not.toHaveBeenCalled();
    });

    it('garde le fond vert des non lues sur une ligne qui est un lien, pas sur une lue', async () => {
      await create(of(LIST), ['ROLE_PRODUCER']);

      expect(rowOf('Nouveau message').querySelector('a')!.classList.contains('bg-badge-bg')).toBe(true);
      expect(rowOf('Profil validé').querySelector('a')!.classList.contains('bg-badge-bg')).toBe(false);
    });

    it('un compte ni client ni producteur n’a aucune destination', async () => {
      await create(of(LIST), ['ROLE_ADMIN']);

      expect(compiled.querySelectorAll('ul a').length).toBe(0);
    });

    it('pour un client, une notification mène à sa demande ou à sa conversation quand le back en donne l’identifiant', async () => {
      const list = [
        note('c1', { type: 'quote_received', title: 'Devis reçu', data: { requestId: 'r-1', conversationId: 'c-1' } }),
        note('c2', { type: 'new_message', title: 'Nouveau message', data: { conversationId: 'c-9' } }),
        note('c3', { type: 'request_expiring_soon', title: 'Demande expirant bientôt', data: { requestId: 'r-2' } }),
        note('c4', { type: 'request_sent', title: 'Demande envoyée' }),
      ];
      await create(of(list), ['ROLE_CLIENT']);

      expect(linkOf('Devis reçu')).toBe('/client/requests/r-1');
      expect(linkOf('Nouveau message')).toBe('/client/messages/c-9');
      expect(linkOf('Demande expirant bientôt')).toBe('/client/requests/r-2');
      expect(linkOf('Demande envoyée')).toBe('/client/requests');
    });

    it('un type du client ne mène nulle part, même pour un producteur', async () => {
      await create(of([note('n9', { type: 'quote_received', title: 'Devis reçu' })]), ['ROLE_PRODUCER']);

      expect(linkOf('Devis reçu')).toBeNull();
      expect(rowOf('Devis reçu').querySelector('button')).toBeTruthy();
    });
  });

  // en attendant les donnees : un squelette a la place d'une zone vide, qui s'efface quand elles arrivent
  it('montre un squelette en attendant les données, puis le contenu', async () => {
    const data = new Subject<typeof LIST>();
    await create(data);
    const skeleton = () => compiled.querySelector('app-page-skeleton');
    expect(skeleton()).toBeTruthy();
    expect(skeleton()!.textContent).toContain('Chargement');

    data.next(LIST);
    fixture.detectChanges();

    expect(skeleton()).toBeNull();
  });
});
