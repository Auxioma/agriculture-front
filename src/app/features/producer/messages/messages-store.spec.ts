import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessagesStore } from './messages-store';
import { MessagesService } from './messages.service';
import { ProducerConversation } from './messages.model';

const conversation = (id: string): ProducerConversation => ({
  id,
  requestId: `r-${id}`,
  clientName: 'Client',
  clientType: 'individual',
  product: null,
  quantity: null,
  unit: null,
  status: 'open',
  lastMessageAt: null,
  unreadCount: 0,
  lastMessage: null,
});

describe('MessagesStore', () => {
  function create(list: ReturnType<typeof vi.fn>): MessagesStore {
    TestBed.configureTestingModule({ providers: [MessagesStore, { provide: MessagesService, useValue: { list } }] });
    return TestBed.inject(MessagesStore);
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('charge la liste dès sa création', () => {
    const store = create(vi.fn(() => of([conversation('c1')])));

    expect(store.conversations()?.map((c) => c.id)).toEqual(['c1']);
  });

  it('reste en chargement tant que le back ne répond pas', () => {
    const store = create(vi.fn(() => NEVER));

    expect(store.conversations()).toBeUndefined();
  });

  it('une première lecture qui échoue donne null (erreur), pas une liste vide', () => {
    const store = create(vi.fn(() => throwError(() => new Error('down'))));

    expect(store.conversations()).toBeNull();
  });

  it('reload relit la liste', () => {
    const list = vi.fn(() => of([conversation('c1')]));
    const store = create(list);
    list.mockReturnValue(of([conversation('c1'), conversation('c2')]));

    store.reload();

    expect(list).toHaveBeenCalledTimes(2);
    expect(store.conversations()?.length).toBe(2);
  });

  it('une relecture qui échoue ne vide pas la liste déjà affichée', () => {
    const list = vi.fn(() => of([conversation('c1')]));
    const store = create(list);
    list.mockReturnValue(throwError(() => new Error('down')));

    store.reload();

    expect(store.conversations()?.map((c) => c.id)).toEqual(['c1']);
  });

  it('retrouve une conversation par son id', () => {
    const store = create(vi.fn(() => of([conversation('c1'), conversation('c2')])));

    expect(store.find('c2')?.id).toBe('c2');
    expect(store.find('inconnue')).toBeUndefined();
  });
});
