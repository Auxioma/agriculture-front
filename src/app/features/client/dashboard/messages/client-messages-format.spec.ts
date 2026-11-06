import { describe, expect, it } from 'vitest';
import { ClientConversation } from './client-messages.model';
import { conversationTime, conversationTitle, matches } from './client-messages-format';

const conversation = (changes: Partial<ClientConversation> = {}): ClientConversation => ({
  id: 'c1',
  requestId: 'r1',
  producerId: 'p1',
  producerName: 'Ferme des Lilas',
  producerSlug: 'ferme-des-lilas',
  product: 'Tomates bio',
  quantity: 5,
  unit: 'kg',
  status: 'open',
  lastMessageAt: '2026-11-04T10:00:00+01:00',
  unreadCount: 0,
  lastMessage: null,
  ...changes,
});

describe('client-messages-format', () => {
  describe('matches', () => {
    it('garde tout quand la recherche est vide', () => {
      expect(matches(conversation(), '   ')).toBe(true);
    });

    it('cherche dans le producteur, le produit et le dernier message, sans accents ni casse', () => {
      const c = conversation({
        lastMessage: { preview: 'Récolte demain', moderated: false, fromMe: false, isSystem: false, hasAttachment: false, createdAt: '2026-11-04T10:00:00+01:00' },
      });

      expect(matches(c, 'LILAS')).toBe(true);
      expect(matches(c, 'tomate')).toBe(true);
      expect(matches(c, 'recolte')).toBe(true);
      expect(matches(c, 'miel')).toBe(false);
    });
  });

  it("conversationTime prend l'heure du dernier message, sinon la dernière activité", () => {
    const withMessage = conversation({
      lastMessage: { preview: 'Bonjour', moderated: false, fromMe: true, isSystem: false, hasAttachment: false, createdAt: '2026-11-05T08:00:00+01:00' },
    });

    expect(conversationTime(withMessage)).toBe('2026-11-05T08:00:00+01:00');
    expect(conversationTime(conversation())).toBe('2026-11-04T10:00:00+01:00');
    expect(conversationTime(conversation({ lastMessageAt: null }))).toBeNull();
  });

  it('conversationTitle donne le produit avec la quantité quand il y en a une', () => {
    expect(conversationTitle(conversation())).toBe('Tomates bio - 5 kg');
    expect(conversationTitle(conversation({ quantity: null, unit: null }))).toBe('Tomates bio');
    expect(conversationTitle(conversation({ product: null, quantity: null }))).toBe('Demande');
  });
});
