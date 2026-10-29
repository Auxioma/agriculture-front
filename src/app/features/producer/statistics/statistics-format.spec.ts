import { describe, expect, it } from 'vitest';
import { barPercent, money, monthLabel, percent } from './statistics-format';

const months = (...counts: number[]) => counts.map((count, i) => ({ month: `2026-0${i + 1}`, count }));

describe('monthLabel', () => {
  it('donne le mois court sans son point, avec une majuscule', () => {
    expect(monthLabel('2026-03')).toBe('Mars');
    expect(monthLabel('2026-05')).toBe('Mai');
    expect(monthLabel('2026-07')).toBe('Juil');
    expect(monthLabel('2026-08')).toBe('Août');
    expect(monthLabel('2026-10')).toBe('Oct');
  });
});

describe('percent', () => {
  it('arrondit et colle le signe au chiffre avec un espace insécable', () => {
    expect(percent(87)).toBe('87 %');
    expect(percent(66.7)).toBe('67 %');
    expect(percent(0)).toBe('0 %');
  });

  it('un tiret tant qu’aucune demande n’est arrivée', () => {
    expect(percent(null)).toBe('—');
  });
});

describe('money', () => {
  it('écrit le montant à la française avec sa devise', () => {
    expect(money(10, 'EUR').replace(/\s/g, ' ')).toBe('10,00 €');
    expect(money(2.5, 'EUR').replace(/\s/g, ' ')).toBe('2,50 €');
  });

  it('un tiret sans montant (pas d’abonnement actif)', () => {
    expect(money(null, 'EUR')).toBe('—');
  });

  it('sans devise connue, le nombre seul', () => {
    expect(money(12.5, null)).toBe('12,5');
  });
});

describe('barPercent', () => {
  it('la plus haute colonne prend toute la hauteur, les autres sont proportionnelles', () => {
    expect(barPercent(10, months(10, 5, 0))).toBe(100);
    expect(barPercent(5, months(10, 5, 0))).toBe(50);
  });

  it('un petit mois reste visible à côté d’un gros', () => {
    expect(barPercent(1, months(100, 1))).toBe(8);
  });

  it('un mois sans demande garde un trait, même quand il n’y a aucune demande du tout', () => {
    expect(barPercent(0, months(10, 0))).toBe(3);
    expect(barPercent(0, months(0, 0, 0))).toBe(3);
  });
});
