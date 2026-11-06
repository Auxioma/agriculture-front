import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { AppNotification, NotificationsService } from '../../../core/notifications/notifications.service';
import { ProducerLayoutComponent } from './producer-layout.component';

const note = (id: string, readAt: string | null = null): AppNotification => ({
  id,
  type: 'new_message',
  title: `Titre ${id}`,
  body: null,
  readAt,
  createdAt: new Date().toISOString(),
});

describe('ProducerLayoutComponent', () => {
  let fixture: ComponentFixture<ProducerLayoutComponent>;
  let compiled: HTMLElement;

  async function create(list: AppNotification[] = [note('n1'), note('n2'), note('n3', '2026-10-26T10:00:00Z')]): Promise<void> {
    const service = { latest: vi.fn(() => of(list)), markAsRead: vi.fn(() => of(null)), markAllAsRead: vi.fn(() => of(null)), changes$: NEVER };
    await TestBed.configureTestingModule({
      imports: [ProducerLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: NotificationsService, useValue: service },
        { provide: AuthService, useValue: { currentUser: signal({ roles: ['ROLE_PRODUCER'] }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProducerLayoutComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const bell = () => compiled.querySelector<HTMLButtonElement>('button[aria-controls=notification-card]')!;

  beforeEach(() => TestBed.resetTestingModule());

  it('affiche une seule cloche, même s’il y a deux barres de navigation (latérale et du bas)', async () => {
    await create();

    expect(compiled.querySelectorAll('app-notification-bell').length).toBe(1);
    expect(compiled.querySelectorAll('nav').length).toBe(2);
  });

  it('compte les notifications non lues sur la cloche', async () => {
    await create();

    expect(bell().getAttribute('aria-label')).toBe('Notifications, 2 non lues');
  });

  it('ouvre la card vers la droite de la barre latérale, avec un lien vers la page des notifications de l’espace', async () => {
    await create();

    bell().click();
    fixture.detectChanges();

    const card = compiled.querySelector('#notification-card')!;
    expect(card.classList.contains('lg:left-0')).toBe(true);
    expect(card.classList.contains('lg:right-0')).toBe(false);
    expect(card.textContent).toContain('Titre n1');
    expect(card.querySelector('a[href="/notifications"]')).toBeNull();
    expect(card.querySelector('a[href="/producer/notifications"]')?.textContent?.trim()).toBe('Voir toutes les notifications');
  });

  it('une notification du producteur mène à la section de son espace qui la concerne', async () => {
    await create();

    bell().click();
    fixture.detectChanges();

    expect(compiled.querySelector('#notification-card li a')?.getAttribute('href')).toBe('/producer/messages');
  });

  it('propose les cinq entrées de l’espace dans les deux barres, la messagerie comprise', async () => {
    await create();

    const links = (nav: Element) => [...nav.querySelectorAll('a')].map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    const expected = [
      ['Accueil', '/producer'],
      ['Demandes', '/producer/requests'],
      ['Messages', '/producer/messages'],
      ['Abonnement', '/producer/subscription'],
      ['Profil', '/producer/profile'],
    ];
    const [side, bottom] = [...compiled.querySelectorAll('nav')];
    expect(links(side)).toEqual(expected);
    expect(links(bottom)).toEqual(expected);
  });
});
