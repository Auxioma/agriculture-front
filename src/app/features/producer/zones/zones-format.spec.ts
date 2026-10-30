import { describe, expect, it } from 'vitest';
import { ProfileZone } from '../profile/profile.service';
import { amountField, buildRules, byRadius, conditions, parseAmount, zoneTitle } from './zones-format';

const zone = (radiusKm: string | null, rules: Record<string, unknown> | null = null, id = 'z'): ProfileZone => ({ id, radiusKm, rules });

describe('parseAmount', () => {
  it('lit un montant avec une virgule ou un point', () => {
    expect(parseAmount('3,5')).toBe(3.5);
    expect(parseAmount('3.50')).toBe(3.5);
    expect(parseAmount(' 20 ')).toBe(20);
    expect(parseAmount('0')).toBe(0);
  });

  it('un champ vide n’est pas une erreur : pas de condition', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('   ')).toBeNull();
  });

  it('refuse les lettres, un montant négatif et plus de deux décimales', () => {
    expect(parseAmount('abc')).toBeNaN();
    expect(parseAmount('-3')).toBeNaN();
    expect(parseAmount('3,456')).toBeNaN();
    expect(parseAmount('3 €')).toBeNaN();
    expect(parseAmount('1,2,3')).toBeNaN();
  });
});

describe('zoneTitle', () => {
  it('dit la distance avec une virgule pour une décimale', () => {
    expect(zoneTitle(zone('15.00'))).toBe("Jusqu'à 15 km");
    expect(zoneTitle(zone('12.50'))).toBe("Jusqu'à 12,5 km");
  });

  it('une zone sans rayon est une zone tracée', () => {
    expect(zoneTitle(zone(null))).toBe('Zone tracée');
  });
});

describe('conditions', () => {
  it('écrit les frais et le minimum en euros', () => {
    const lines = conditions(zone('15.00', { frais: '3.00', minimum: '20.00' })).map((line) => line.replace(/\s/g, ' '));

    expect(lines).toEqual(['Frais de livraison : 3,00 €', 'Commande minimum : 20,00 €']);
  });

  it('n’écrit que ce qui est indiqué', () => {
    expect(conditions(zone('15.00', { minimum: '45.00' })).map((line) => line.replace(/\s/g, ' '))).toEqual(['Commande minimum : 45,00 €']);
  });

  it('une gratuité (0) est une condition, une valeur vide ou illisible n’en est pas', () => {
    expect(conditions(zone('15.00', { frais: '0.00' })).length).toBe(1);
    expect(conditions(zone('15.00', { frais: '', minimum: 'beaucoup' }))).toEqual([]);
    expect(conditions(zone('15.00', null))).toEqual([]);
  });
});

describe('amountField', () => {
  it('montre la valeur enregistrée comme on la taperait', () => {
    expect(amountField(zone('15.00', { frais: '3.00', minimum: '6.50' }), 'fee')).toBe('3');
    expect(amountField(zone('15.00', { frais: '3.00', minimum: '6.50' }), 'minimum')).toBe('6,5');
  });

  it('un champ vide quand la condition n’existe pas', () => {
    expect(amountField(zone('15.00', null), 'fee')).toBe('');
    expect(amountField(zone('15.00', { frais: '3.00' }), 'minimum')).toBe('');
  });
});

describe('buildRules', () => {
  it('écrit les montants avec deux décimales', () => {
    expect(buildRules(null, 3.5, 20)).toEqual({ frais: '3.50', minimum: '20.00' });
  });

  it('garde les autres conditions de la zone, ce n’est pas à cette page de les effacer', () => {
    expect(buildRules({ frais: '3.00', jours: ['mardi'] }, 4, null)).toEqual({ jours: ['mardi'], frais: '4.00' });
  });

  it('un champ vidé retire la condition, plus aucune condition donne null', () => {
    expect(buildRules({ frais: '3.00', minimum: '20.00' }, null, 20)).toEqual({ minimum: '20.00' });
    expect(buildRules({ frais: '3.00', minimum: '20.00' }, null, null)).toBeNull();
  });

  it('une livraison gratuite (0) est gardée', () => {
    expect(buildRules(null, 0, null)).toEqual({ frais: '0.00' });
  });
});

describe('byRadius', () => {
  it('range de la plus petite à la plus grande, sans rayon en dernier', () => {
    const sorted = [zone('40.00', null, 'b'), zone(null, null, 'c'), zone('15.00', null, 'a')].sort(byRadius);

    expect(sorted.map((z) => z.id)).toEqual(['a', 'b', 'c']);
  });
});
