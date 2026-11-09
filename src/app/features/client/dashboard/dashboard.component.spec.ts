import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { NEVER, of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ClientDashboardComponent } from './dashboard.component';
import { ClientDashboardService } from './dashboard.service';
import { AuthService } from '../../../core/auth/auth.service';
import { DashboardSummary } from './dashboard.model';

const fullSummary: DashboardSummary = {
  activeRequests: 4,
  receivedReplies: 2,
  unreadMessages: 5,
  requests: [
    { id: 'r1', title: 'Pommes bio', sentAt: '2026-10-01T10:00:00Z', status: 'replied' },
    { id: 'r2', title: 'Miel de châtaignier', sentAt: '2026-10-03T10:00:00Z', status: 'pending' },
  ],
  messages: [
    {
      id: 'm1',
      producerName: 'Ferme Dupont',
      initials: 'FD',
      subtitle: 'Bonjour, oui...',
      unreadCount: 3,
    },
    {
      id: 'm2',
      producerName: 'Verger Martin',
      initials: 'VM',
      subtitle: 'Merci !',
      unreadCount: 0,
    },
  ],
  favorites: [
    { id: 'f1', slug: 'ferme-dupont', name: 'Ferme Dupont', initials: 'FD' },
    { id: 'f2', slug: null, name: 'Verger Martin', initials: 'VM' },
  ],
};

const emptySummary: DashboardSummary = {
  activeRequests: 0,
  receivedReplies: 0,
  unreadMessages: 0,
  requests: [],
  messages: [],
  favorites: [],
};

describe('ClientDashboardComponent', () => {
  let fixture: ComponentFixture<ClientDashboardComponent>;
  let el: HTMLElement;
  let currentUser: WritableSignal<{ firstName: string } | null>;

  // Crée le component avec un résumé donné (NEVER = la requête n'a pas encore répondu)
  async function setup(
    summary: DashboardSummary | null,
    user: { firstName: string } | null = { firstName: 'Léa' },
  ) {
    currentUser = signal(user);

    await TestBed.configureTestingModule({
      imports: [ClientDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser } },
        {
          provide: ClientDashboardService,
          useValue: { getSummary: () => (summary ? of(summary) : NEVER) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientDashboardComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const section = (id: string) =>
    el.querySelector<HTMLElement>(`section[aria-labelledby="${id}"]`)!;

  beforeEach(() => TestBed.resetTestingModule());

  describe('chargement', () => {
    it('n’affiche rien tant que le résumé n’est pas arrivé', async () => {
      await setup(null);
      expect(el.querySelector('h1')).toBeNull();
    });
  });

  describe('liens', () => {
    it('chaque demande mène à son détail, chaque conversation à son fil', async () => {
      await setup(fullSummary);

      const requests = Array.from(section('requests-title').querySelectorAll('li a')).map((a) => a.getAttribute('href'));
      const messages = Array.from(section('messages-title').querySelectorAll('li a')).map((a) => a.getAttribute('href'));

      expect(requests).toEqual(['/client/requests/r1', '/client/requests/r2']);
      expect(messages).toEqual(['/client/messages/m1', '/client/messages/m2']);
    });
  });

  describe('en-tête', () => {
    it('affiche le prénom de l’utilisateur', async () => {
      await setup(fullSummary);
      expect(el.querySelector('h1')!.textContent).toContain('Léa');
    });

    it('utilise « à vous » si le prénom est absent', async () => {
      await setup(fullSummary, null);
      expect(el.querySelector('h1')!.textContent).toContain('à vous');
    });
  });

  describe('statistiques', () => {
    it('affiche les 3 compteurs avec leur libellé', async () => {
      await setup(fullSummary);
      const cards = Array.from(el.querySelectorAll('section[aria-label="Résumé"] > div'));

      expect(cards.map((c) => c.textContent!.replace(/\s+/g, ' ').trim())).toEqual([
        '4 Demandes actives',
        '2 Réponses reçues',
        '5 Messages non lus',
      ]);
    });
  });

  describe('demandes', () => {
    it('affiche une ligne par demande avec son titre', async () => {
      await setup(fullSummary);
      const items = section('requests-title').querySelectorAll('li');

      expect(items).toHaveLength(2);
      expect(items[0].textContent).toContain('Pommes bio');
      expect(items[1].textContent).toContain('Miel de châtaignier');
    });

    it('affiche le bon badge selon le statut', async () => {
      await setup(fullSummary);
      const badges = section('requests-title').querySelectorAll<HTMLElement>('span.rounded-full');

      expect(badges[0].textContent!.trim()).toBe('Réponses reçues');
      expect(badges[0].classList).toContain('bg-success');
      expect(badges[1].textContent!.trim()).toBe('En attente');
      expect(badges[1].classList).toContain('bg-warning');
    });

    it('affiche le message vide si aucune demande', async () => {
      await setup(emptySummary);
      expect(section('requests-title').textContent).toContain('Aucune demande pour le moment.');
    });
  });

  describe('messages', () => {
    it('affiche le nom, les initiales et l’aperçu', async () => {
      await setup(fullSummary);
      const text = section('messages-title').textContent!;

      expect(text).toContain('Ferme Dupont');
      expect(text).toContain('FD');
      expect(text).toContain('Bonjour, oui...');
    });

    it('affiche le badge de non-lus uniquement si unreadCount > 0', async () => {
      await setup(fullSummary);
      const badges = section('messages-title').querySelectorAll('[aria-label$="messages non lus"]');

      expect(badges).toHaveLength(1);
      expect(badges[0].getAttribute('aria-label')).toBe('3 messages non lus');
      expect(badges[0].textContent!.trim()).toBe('3');
    });

    it('affiche le message vide si aucun message', async () => {
      await setup(emptySummary);
      expect(section('messages-title').textContent).toContain('Aucun message.');
    });
  });

  describe('favoris', () => {
    it('crée un lien par slug, avec repli sur l’id si le slug est null', async () => {
      await setup(fullSummary);
      const links = section('favorites-title').querySelectorAll('a');

      expect(links).toHaveLength(2);
      expect(links[0].getAttribute('href')).toBe('/producers/ferme-dupont');
      expect(links[1].getAttribute('href')).toBe('/producers/f2');
    });

    it('affiche le message vide si aucun favori', async () => {
      await setup(emptySummary);
      expect(section('favorites-title').textContent).toContain('Aucun favori.');
    });
  });

  it('affiche le lien vers toutes les demandes', async () => {
    await setup(fullSummary);
    const link = el.querySelector('a[href="/client/requests"]');

    expect(link).not.toBeNull();
    expect(link!.textContent).toContain('Voir toutes mes demandes');
  });
});
