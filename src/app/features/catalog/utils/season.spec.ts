import { makeProduct } from '../testing/catalog.fixtures';
import { isInSeason } from './season';

describe('isInSeason', () => {
  const season = (start: number | null, end: number | null) =>
    makeProduct({ seasonStartMonth: start, seasonEndMonth: end });

  it('est vrai pour un mois compris dans une saison normale, bornes incluses', () => {
    expect(isInSeason(season(6, 9), 6)).toBe(true);
    expect(isInSeason(season(6, 9), 7)).toBe(true);
    expect(isInSeason(season(6, 9), 9)).toBe(true);
  });

  it("est faux pour un mois hors d'une saison normale", () => {
    expect(isInSeason(season(6, 9), 5)).toBe(false);
    expect(isInSeason(season(6, 9), 10)).toBe(false);
  });

  it('gère une saison à cheval sur deux années (novembre à février)', () => {
    for (const month of [11, 12, 1, 2]) {
      expect(isInSeason(season(11, 2), month)).toBe(true);
    }
    for (const month of [3, 4, 5, 6, 7, 8, 9, 10]) {
      expect(isInSeason(season(11, 2), month)).toBe(false);
    }
  });

  it('gère un mois unique', () => {
    expect(isInSeason(season(5, 5), 5)).toBe(true);
    expect(isInSeason(season(5, 5), 4)).toBe(false);
  });

  it("n'est jamais « de saison » sans dates de saison", () => {
    expect(isInSeason(season(null, null), 6)).toBe(false);
    expect(isInSeason(season(6, null), 6)).toBe(false);
    expect(isInSeason(season(null, 9), 6)).toBe(false);
  });
});
