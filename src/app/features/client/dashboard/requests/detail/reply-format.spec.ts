import { describe, expect, it } from 'vitest';
import { STATUS_UI } from '../request-status';
import { REPLY_STATUS_UI, dayLabel, isUndecided, priceLabel, requestLabel, unitLabel } from './reply-format';

describe('reply-format', () => {
  describe('priceLabel', () => {
    it('met toujours deux décimales et le symbole de la devise', () => {
      expect(priceLabel({ priceAmount: 12.5, currency: '€' })).toMatch(/^12,50\s€$/);
      expect(priceLabel({ priceAmount: 12, currency: '€' })).toMatch(/^12,00\s€$/);
    });

    it("prend l'euro quand le back ne donne pas de devise", () => {
      expect(priceLabel({ priceAmount: 3, currency: null })).toMatch(/€$/);
    });

    it("ne donne rien quand le producteur n'a pas chiffré sa réponse", () => {
      expect(priceLabel({ priceAmount: null, currency: '€' })).toBeNull();
    });
  });

  describe('dayLabel', () => {
    it('écrit le jour et le mois, pour un jour seul comme pour une date complète', () => {
      expect(dayLabel('2026-11-14')).toBe('14 novembre');
      expect(dayLabel('2026-11-14T08:00:00+01:00')).toBe('14 novembre');
    });
  });

  it('unitLabel traduit les unités connues et garde les autres telles quelles', () => {
    expect(unitLabel('unite')).toBe('unité');
    expect(unitLabel('caisse')).toBe('caisse');
    expect(unitLabel(null)).toBe('');
  });

  it('requestLabel donne le produit, avec la quantité quand il y en a une', () => {
    expect(requestLabel({ product: 'Tomates', quantity: 5, unit: 'kg' })).toBe('Tomates - 5 kg');
    expect(requestLabel({ product: 'Miel', quantity: null, unit: null })).toBe('Miel');
    expect(requestLabel({ product: null, quantity: null, unit: null })).toBe('Demande');
  });

  it("isUndecided : seules les réponses envoyées ou vues attendent encore le choix du client", () => {
    expect(isUndecided('sent')).toBe(true);
    expect(isUndecided('seen')).toBe(true);
    expect(isUndecided('accepted')).toBe(false);
    expect(isUndecided('declined')).toBe(false);
  });

  it('chaque statut de réponse a son libellé', () => {
    expect(Object.keys(REPLY_STATUS_UI).sort()).toEqual(['accepted', 'archived', 'declined', 'expired', 'seen', 'sent']);
  });
});

// une demande dans un statut sans libellé ferait planter la liste (STATUS_UI[status] indéfini) : le back peut renvoyer tous ceux-ci
describe('STATUS_UI', () => {
  it('a un libellé pour chaque statut de demande que la liste peut contenir', () => {
    for (const status of ['sent', 'waiting_replies', 'replies_received', 'conversation_open', 'deal_found', 'reported', 'archived', 'expired']) {
      expect(STATUS_UI[status as keyof typeof STATUS_UI], status).toBeDefined();
    }
  });
});
