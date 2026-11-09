import { describe, expect, it } from 'vitest';
import { averageLabel, basedOn, reviewDate } from './reviews-format';

const NOW = new Date('2026-10-29T12:00:00');

describe('averageLabel', () => {
  it('écrit la moyenne à la française avec une décimale', () => {
    expect(averageLabel(4.8)).toBe('4,8');
    expect(averageLabel(3.5)).toBe('3,5');
  });

  it('garde la décimale pour une moyenne pile', () => {
    expect(averageLabel(5)).toBe('5,0');
  });
});

describe('basedOn', () => {
  it('dit sur combien d’avis repose la moyenne', () => {
    expect(basedOn(24)).toBe('Basé sur 24 avis');
    expect(basedOn(1)).toBe('Basé sur 1 avis');
  });
});

describe('reviewDate', () => {
  it('donne le jour et le mois pour un avis de cette année', () => {
    expect(reviewDate('2026-08-10T09:00:00', NOW)).toBe('10 août');
    expect(reviewDate('2026-09-01T09:00:00', NOW)).toBe('1er septembre');
  });

  it('ajoute l’année pour un avis plus ancien', () => {
    expect(reviewDate('2025-03-05T09:00:00', NOW)).toBe('5 mars 2025');
  });
});
