import { describe, expect, it } from 'vitest';
import { LastMessage, ProducerConversation } from './messages.model';
import { clockTime, conversationTime, dayLabel, fileProblem, initials, listTime, matches, previewText } from './messages-format';

const conversation = (overrides: Partial<ProducerConversation> = {}): ProducerConversation => ({
  id: 'c1',
  requestId: 'r1',
  clientName: 'Camille R.',
  clientType: 'individual',
  product: 'Tomates bio',
  quantity: 20,
  unit: 'kg',
  status: 'open',
  lastMessageAt: null,
  unreadCount: 0,
  lastMessage: null,
  ...overrides,
});

const last = (overrides: Partial<LastMessage> = {}): LastMessage => ({
  preview: 'Bonjour',
  moderated: false,
  fromMe: false,
  isSystem: false,
  hasAttachment: false,
  createdAt: '2026-10-27T09:16:00',
  ...overrides,
});

// un mardi, a midi : les dates sans fuseau sont lues dans l'heure locale, comme l'affichage
const NOW = new Date('2026-10-27T12:00:00');

describe('initials', () => {
  it('prend la premiere lettre des deux premiers mots', () => {
    expect(initials('Camille R.')).toBe('CR');
    expect(initials('Coopérative Sud')).toBe('CS');
    expect(initials('Jean Pierre Martin')).toBe('JP');
  });

  it('un seul mot donne une seule lettre, un nom vide aucune', () => {
    expect(initials('Client')).toBe('C');
    expect(initials('  ')).toBe('');
  });
});

describe('listTime', () => {
  it("montre l'heure pour aujourd'hui, même tard dans la soirée", () => {
    expect(listTime('2026-10-27T09:16:00', NOW)).toBe('09:16');
    expect(listTime('2026-10-27T23:59:00', NOW)).toBe('23:59');
  });

  it('dit « Hier » pour la veille, même si elle est toute proche', () => {
    expect(listTime('2026-10-26T23:59:00', NOW)).toBe('Hier');
    expect(listTime('2026-10-26T00:01:00', NOW)).toBe('Hier');
  });

  it('donne le jour de la semaine jusqu\'à six jours, puis la date', () => {
    expect(listTime('2026-10-25T10:00:00', NOW)).toBe('Dim.');
    expect(listTime('2026-10-21T10:00:00', NOW)).toBe('Mer.');
    expect(listTime('2026-10-20T10:00:00', NOW)).toBe('20 oct.');
  });
});

describe('dayLabel', () => {
  it("dit Aujourd'hui et Hier", () => {
    expect(dayLabel('2026-10-27T08:00:00', NOW)).toBe("Aujourd'hui");
    expect(dayLabel('2026-10-26T08:00:00', NOW)).toBe('Hier');
  });

  it("écrit le jour en toutes lettres, avec l'année seulement si ce n'est pas la même", () => {
    expect(dayLabel('2026-10-25T08:00:00', NOW)).toBe('dimanche 25 octobre');
    expect(dayLabel('2025-12-31T08:00:00', NOW)).toBe('mercredi 31 décembre 2025');
  });
});

describe('clockTime', () => {
  it('écrit les heures sur deux chiffres', () => {
    expect(clockTime('2026-10-27T09:05:00')).toBe('09:05');
  });
});

describe('previewText', () => {
  it('sans message, le dit', () => {
    expect(previewText(null)).toBe('Pas encore de message');
  });

  it('montre le texte du client tel quel et préfixe « Vous : » pour le producteur', () => {
    expect(previewText(last())).toBe('Bonjour');
    expect(previewText(last({ fromMe: true }))).toBe('Vous : Bonjour');
  });

  it('une pièce jointe sans texte se dit « Pièce jointe », avec texte elle garde la légende', () => {
    expect(previewText(last({ preview: null, hasAttachment: true }))).toBe('Pièce jointe');
    expect(previewText(last({ preview: 'Le devis', hasAttachment: true }))).toBe('Le devis');
  });

  it('un message modéré ne montre jamais son texte', () => {
    expect(previewText(last({ preview: 'secret', moderated: true }))).toBe('Message masqué');
  });
});

describe('conversationTime', () => {
  it('prend le dernier message, sinon la dernière activité connue', () => {
    expect(conversationTime(conversation({ lastMessage: last(), lastMessageAt: '2026-10-01T08:00:00' }))).toBe('2026-10-27T09:16:00');
    expect(conversationTime(conversation({ lastMessageAt: '2026-10-01T08:00:00' }))).toBe('2026-10-01T08:00:00');
    expect(conversationTime(conversation())).toBeNull();
  });
});

describe('matches', () => {
  it('une recherche vide garde tout', () => {
    expect(matches(conversation(), '')).toBe(true);
    expect(matches(conversation(), '   ')).toBe(true);
  });

  it('cherche dans le nom, le produit et le dernier message, sans accents ni casse', () => {
    expect(matches(conversation({ clientName: 'Coopérative Sud' }), 'COOPERATIVE')).toBe(true);
    expect(matches(conversation(), 'tomate')).toBe(true);
    expect(matches(conversation({ lastMessage: last({ preview: 'Possible de livrer sur Bron ?' }) }), 'bron')).toBe(true);
  });

  it('écarte ce qui ne correspond à rien', () => {
    expect(matches(conversation({ lastMessage: last({ preview: null }) }), 'miel')).toBe(false);
    expect(matches(conversation({ product: null }), 'miel')).toBe(false);
  });
});

describe('fileProblem', () => {
  it('accepte une image ou un pdf de taille raisonnable', () => {
    expect(fileProblem(new File(['x'], 'photo.png', { type: 'image/png' }))).toBeNull();
    expect(fileProblem(new File(['x'], 'devis.pdf', { type: 'application/pdf' }))).toBeNull();
  });

  it('refuse un autre format', () => {
    expect(fileProblem(new File(['x'], 'tableau.xlsx', { type: 'application/vnd.ms-excel' }))).toContain('Format non supporté');
  });

  it('refuse un fichier de plus de 10 Mo, accepte pile 10 Mo', () => {
    const size = 10 * 1024 * 1024;
    expect(fileProblem(new File([new Uint8Array(size + 1)], 'gros.pdf', { type: 'application/pdf' }))).toContain('10 Mo');
    expect(fileProblem(new File([new Uint8Array(size)], 'limite.pdf', { type: 'application/pdf' }))).toBeNull();
  });
});
