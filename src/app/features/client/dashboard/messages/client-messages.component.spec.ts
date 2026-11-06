import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LastMessage } from '../../../producer/messages/messages.model';
import { ClientMessagesComponent } from './client-messages.component';
import { ClientConversation } from './client-messages.model';
import { ClientMessagesService } from './client-messages.service';

@Component({ template: '<p>fil ouvert</p>' })
class ThreadStub {}

// aujourd'hui a l'heure donnee, dans l'heure locale
const todayAt = (time: string) => `${new Date().toLocaleDateString('sv-SE')}T${time}`;

const last = (overrides: Partial<LastMessage> = {}): LastMessage => ({
  preview: 'Bonjour',
  moderated: false,
  fromMe: false,
  isSystem: false,
  hasAttachment: false,
  createdAt: todayAt('09:16:00'),
  ...overrides,
});

const conversation = (overrides: Partial<ClientConversation>): ClientConversation => ({
  id: 'c1',
  requestId: 'r1',
  producerId: 'p1',
  producerName: 'Ferme',
  producerSlug: 'ferme',
  product: null,
  quantity: null,
  unit: null,
  status: 'open',
  lastMessageAt: null,
  unreadCount: 0,
  lastMessage: null,
  ...overrides,
});

const CONVERSATIONS: ClientConversation[] = [
  conversation({ id: 'c1', producerName: 'Ferme des Lilas', product: 'Tomates bio', unreadCount: 2, lastMessage: last({ preview: 'Oui, disponible cette semaine' }) }),
  conversation({ id: 'c2', producerName: 'Miellerie du Parc', product: 'Miel toutes fleurs', lastMessage: last({ preview: 'Merci pour votre message', fromMe: true }) }),
  conversation({ id: 'c3', producerName: 'Verger Sud', product: 'Pommes', lastMessage: last({ preview: null, hasAttachment: true }) }),
];

describe('ClientMessagesComponent', () => {
  let harness: RouterTestingHarness;
  let listMock: ReturnType<typeof vi.fn>;

  async function create(data$: Observable<ClientConversation[]> = of(CONVERSATIONS), url = '/client/messages'): Promise<void> {
    listMock = vi.fn(() => data$);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'client/messages', component: ClientMessagesComponent, children: [{ path: ':id', component: ThreadStub }] }]),
        { provide: ClientMessagesService, useValue: { list: listMock } },
      ],
    });
    harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
  }

  const compiled = () => harness.fixture.nativeElement as HTMLElement;
  const rows = () => [...compiled().querySelectorAll('ul > li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim() ?? '');
  const section = (label: string) => compiled().querySelector(`section[aria-label="${label}"]`)!;
  const search = (value: string) => {
    const input = compiled().querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    harness.fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('liste les conversations du client avec le producteur, le produit et le dernier message', async () => {
    await create();

    expect(listMock).toHaveBeenCalled();
    expect(rows()).toHaveLength(3);
    expect(rows()[0]).toContain('Ferme des Lilas');
    expect(rows()[0]).toContain('Tomates bio');
    expect(rows()[0]).toContain('Oui, disponible cette semaine');
  });

  it('précède de « Vous : » ce que le client a écrit en dernier, et dit « Pièce jointe » pour un fichier seul', async () => {
    await create();

    expect(rows()[1]).toContain('Vous : Merci pour votre message');
    expect(rows()[2]).toContain('Pièce jointe');
  });

  it('montre le nombre de messages non lus sur la ligne concernée seulement', async () => {
    await create();

    expect(rows()[0]).toContain('2 non lus');
    expect(rows()[1]).not.toContain('non lus');
  });

  it('chaque ligne mène au fil de sa conversation', async () => {
    await create();

    const hrefs = [...compiled().querySelectorAll('ul > li a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/client/messages/c1', '/client/messages/c2', '/client/messages/c3']);
  });

  it('la recherche filtre sur le producteur, le produit ou le dernier message, et le dit quand rien ne correspond', async () => {
    await create();

    search('miel');
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toContain('Miellerie du Parc');

    search('zzz');
    expect(rows()).toHaveLength(0);
    expect(compiled().textContent).toContain('Aucune conversation ne correspond à votre recherche.');
  });

  it("explique comment s'ouvre une conversation quand il n'y en a aucune", async () => {
    await create(of([]));

    expect(compiled().textContent).toContain('Aucune conversation pour le moment');
    expect(compiled().textContent).toContain('un producteur répond à votre demande');
  });

  it('prévient quand la liste ne se charge pas', async () => {
    await create(throwError(() => new Error('500')));

    expect(compiled().textContent).toContain('Impossible de charger les messages');
  });

  it('en mobile le fil ouvert prend la place de la liste, qui revient quand on le ferme', async () => {
    await create(of(CONVERSATIONS), '/client/messages/c1');

    expect(section('Conversations').classList.contains('hidden')).toBe(true);
    expect(compiled().textContent).toContain('fil ouvert');

    await harness.navigateByUrl('/client/messages');
    harness.fixture.detectChanges();
    expect(section('Conversations').classList.contains('hidden')).toBe(false);
    expect(section('Conversation').classList.contains('hidden')).toBe(true);
  });
});
