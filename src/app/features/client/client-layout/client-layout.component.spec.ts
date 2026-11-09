import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import {
  AppNotification,
  NotificationsService,
} from '../../../core/notifications/notifications.service';
import { ClientLayoutComponent } from './client-layout.component';

const note = (id: string, readAt: string | null = null): AppNotification => ({
  id,
  type: 'producer_replied',
  title: `Titre ${id}`,
  body: null,
  data: { requestId: 'req-1' },
  readAt,
  createdAt: new Date().toISOString(),
});

@Component({ template: '<p>page</p>' })
class PageStub {}

describe('ClientLayoutComponent', () => {
  let harness: RouterTestingHarness;

  beforeEach(() => TestBed.resetTestingModule());

  async function open(
    url: string,
    list: AppNotification[] = [note('n1'), note('n2'), note('n3', '2026-11-05T10:00:00Z')],
  ) {
    const notifications = {
      latest: vi.fn(() => of(list)),
      markAsRead: vi.fn(() => of(null)),
      markAllAsRead: vi.fn(() => of(null)),
      changes$: NEVER,
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: NotificationsService, useValue: notifications },
        { provide: AuthService, useValue: { currentUser: signal({ roles: ['ROLE_CLIENT'] }) } },
        provideRouter([
          {
            path: 'client',
            component: ClientLayoutComponent,
            children: [
              { path: '', component: PageStub },
              { path: 'requests', component: PageStub },
              { path: 'requests/:id', component: PageStub },
              {
                path: 'messages',
                component: PageStub,
                children: [{ path: ':id', component: PageStub }],
              },
              { path: 'favorites', component: PageStub },
              { path: 'profile', component: PageStub },
            ],
          },
        ]),
      ],
    });
    harness = await RouterTestingHarness.create(url);
    harness.fixture.detectChanges();
    return harness.fixture.nativeElement as HTMLElement;
  }

  // la barre latérale (desktop) puis la barre d'onglets (mobile) : les mêmes liens deux fois
  const links = (el: HTMLElement) =>
    [...el.querySelectorAll('nav[aria-label="Espace client"]')][1].querySelectorAll('a');
  const active = (el: HTMLElement) =>
    [...links(el)]
      .filter((a) => a.classList.contains('text-agri!'))
      .map((a) => a.textContent?.trim());

  it('mène chaque entrée du menu à sa page, la messagerie comprise', async () => {
    const el = await open('/client');

    expect([...links(el)].map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Accueil', '/client'],
      ['Demandes', '/client/requests'],
      ['Messages', '/client/messages'],
      ['Favoris', '/client/favorites'],
      ['Profil', '/client/profile'],
    ]);
  });

  it("garde « Demandes » actif sur le détail d'une demande", async () => {
    expect(active(await open('/client/requests/abc'))).toEqual(['Demandes']);
  });

  it('garde « Messages » actif sur un fil de conversation', async () => {
    expect(active(await open('/client/messages/c1'))).toEqual(['Messages']);
  });

  it("n'active « Accueil » que sur l'accueil", async () => {
    expect(active(await open('/client'))).toEqual(['Accueil']);
    TestBed.resetTestingModule();
    expect(active(await open('/client/profile'))).toEqual(['Profil']);
  });

  // * La cloche d'un client connecté : le menu de son espace n'a pas de barre du haut, elle vit à côté du nom du site
  describe('cloche de notifications', () => {
    const bell = (el: HTMLElement) =>
      el.querySelector<HTMLButtonElement>('button[aria-controls=notification-card]')!;

    it('affiche une seule cloche, même avec deux barres de navigation (latérale et du bas)', async () => {
      const el = await open('/client');

      expect(el.querySelectorAll('app-notification-bell').length).toBe(1);
      expect(el.querySelectorAll('nav').length).toBe(2);
    });

    it('compte les notifications non lues', async () => {
      const el = await open('/client');

      expect(bell(el).getAttribute('aria-label')).toBe('Notifications, 2 non lues');
    });

    it('reste là sur toutes les pages de l’espace, le fil d’une conversation compris', async () => {
      expect(bell(await open('/client/messages/c1'))).not.toBeNull();
    });

    it('ouvre la card vers la droite de la barre latérale, avec « Voir toutes » vers /notifications', async () => {
      const el = await open('/client');

      bell(el).click();
      harness.fixture.detectChanges();

      const card = el.querySelector('#notification-card')!;
      expect(card.classList.contains('lg:left-0')).toBe(true);
      expect(card.textContent).toContain('Titre n1');
      expect(card.querySelector('a[href="/notifications"]')?.textContent?.trim()).toBe(
        'Voir toutes les notifications',
      );
      expect(card.querySelector('a[href="/producer/notifications"]')).toBeNull();
    });

    it('une notification de réponse mène à la demande du client', async () => {
      const el = await open('/client');

      bell(el).click();
      harness.fixture.detectChanges();

      expect(el.querySelector('#notification-card li a')?.getAttribute('href')).toBe(
        '/client/requests/req-1',
      );
    });
  });
});
