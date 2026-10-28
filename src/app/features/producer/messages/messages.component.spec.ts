import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessagesComponent } from './messages.component';
import { MessagesService } from './messages.service';
import { LastMessage, ProducerConversation } from './messages.model';

@Component({ template: '<p>fil ouvert</p>' })
class ThreadStub {}

const NOW = new Date();
// aujourd'hui a 09:16, dans l'heure locale
const todayAt = (time: string) => `${NOW.toLocaleDateString('sv-SE')}T${time}`;

const last = (overrides: Partial<LastMessage> = {}): LastMessage => ({
  preview: 'Bonjour',
  moderated: false,
  fromMe: false,
  isSystem: false,
  hasAttachment: false,
  createdAt: todayAt('09:16:00'),
  ...overrides,
});

const conversation = (overrides: Partial<ProducerConversation>): ProducerConversation => ({
  id: 'c1',
  requestId: 'r1',
  clientName: 'Client',
  clientType: 'individual',
  product: null,
  quantity: null,
  unit: null,
  status: 'open',
  lastMessageAt: null,
  unreadCount: 0,
  lastMessage: null,
  ...overrides,
});

const CONVERSATIONS: ProducerConversation[] = [
  conversation({ id: 'c1', requestId: 'r1', clientName: 'Camille R.', product: 'Tomates bio', unreadCount: 2, lastMessage: last({ preview: 'Je souhaite 5kg pour ce week-end' }) }),
  conversation({ id: 'c2', requestId: 'r2', clientName: 'Lucas M.', product: 'Miel toutes fleurs', lastMessage: last({ preview: "D'accord, merci pour le devis", fromMe: true }) }),
  conversation({ id: 'c3', requestId: 'r3', clientName: 'Coopérative Sud', product: 'Pommes de terre', lastMessage: last({ preview: null, hasAttachment: true }) }),
];

describe('MessagesComponent', () => {
  let harness: RouterTestingHarness;
  let listMock: ReturnType<typeof vi.fn>;

  async function create(data$: Observable<ProducerConversation[]> = of(CONVERSATIONS), url = '/producer/messages'): Promise<void> {
    listMock = vi.fn(() => data$);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'producer/messages', component: MessagesComponent, children: [{ path: ':id', component: ThreadStub }] }]),
        { provide: MessagesService, useValue: { list: listMock } },
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

  it('liste les conversations avec le client, le produit, le dernier message, son heure et les messages non lus', async () => {
    await create();

    const list = rows();
    expect(list.length).toBe(3);
    expect(list[0]).toContain('Camille R.');
    expect(list[0]).toContain('· Tomates bio');
    expect(list[0]).toContain('Je souhaite 5kg pour ce week-end');
    expect(list[0]).toContain('09:16');
    expect(list[0]).toContain('2 non lus');
    expect(list[1]).not.toContain('non lus');
  });

  it('montre les initiales, « Vous : » devant ce que le producteur a écrit et « Pièce jointe » sans texte', async () => {
    await create();

    const list = rows();
    expect(list[0]).toMatch(/^CR /);
    expect(list[1]).toContain("Vous : D'accord, merci pour le devis");
    expect(list[2]).toMatch(/^CS /);
    expect(list[2]).toContain('Pièce jointe');
  });

  it("chaque ligne mène au fil de sa conversation", async () => {
    await create();

    const links = [...compiled().querySelectorAll('ul a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/producer/messages/c1', '/producer/messages/c2', '/producer/messages/c3']);
  });

  it('la recherche filtre sur le nom, le produit ou le message, sans tenir compte des accents', async () => {
    await create();

    search('cooperative');
    expect(rows().length).toBe(1);
    expect(rows()[0]).toContain('Coopérative Sud');

    search('miel');
    expect(rows()[0]).toContain('Lucas M.');

    search('week-end');
    expect(rows()[0]).toContain('Camille R.');
  });

  it("dit qu'aucune conversation ne correspond quand la recherche ne trouve rien", async () => {
    await create();

    search('zzz');

    expect(rows().length).toBe(0);
    expect(compiled().textContent).toContain('Aucune conversation ne correspond à votre recherche.');
  });

  it("explique comment une conversation s'ouvre quand il n'y en a pas encore", async () => {
    await create(of([]));

    expect(compiled().textContent).toContain('Aucune conversation pour le moment.');
    expect(compiled().textContent).toContain('vous répondez à une demande');
  });

  it("prévient quand la liste ne se charge pas, sans afficher d'erreur technique", async () => {
    await create(throwError(() => new Error('down')));

    expect(compiled().textContent).toContain('Impossible de charger les messages pour le moment.');
    expect(rows().length).toBe(0);
  });

  it("en mobile, la liste seule s'affiche tant qu'aucun fil n'est ouvert, puis le fil prend sa place", async () => {
    await create();

    expect(section('Conversations').classList.contains('hidden')).toBe(false);
    expect(section('Conversation').classList.contains('hidden')).toBe(true);

    await harness.navigateByUrl('/producer/messages/c1');
    harness.fixture.detectChanges();

    expect(section('Conversations').classList.contains('hidden')).toBe(true);
    expect(section('Conversation').classList.contains('hidden')).toBe(false);
    expect(compiled().textContent).toContain('fil ouvert');
  });

  it('surligne la conversation ouverte', async () => {
    await create(of(CONVERSATIONS), '/producer/messages/c2');

    const active = [...compiled().querySelectorAll('ul a')].filter((a) => a.classList.contains('bg-badge-bg'));
    expect(active.map((a) => a.getAttribute('href'))).toEqual(['/producer/messages/c2']);
  });

  // « Discuter avec le client » (detail d'un devis) arrive avec l'id de la demande
  it("?request=… ouvre la conversation de cette demande une fois la liste chargée", async () => {
    await create(of(CONVERSATIONS), '/producer/messages?request=r2');

    expect(TestBed.inject(Router).url).toBe('/producer/messages/c2');
  });

  it("?request=… vers une demande sans conversation ramène à la liste, sans erreur", async () => {
    await create(of(CONVERSATIONS), '/producer/messages?request=inconnue');

    expect(TestBed.inject(Router).url).toBe('/producer/messages');
    expect(rows().length).toBe(3);
  });
});
