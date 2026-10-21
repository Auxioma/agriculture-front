import { describe, it, expect } from 'vitest';
import { availability, initials, largestRadius, shownLabels } from './profile-format';

describe('initials', () => {
  it('prend l initiale des deux premiers mots', () => {
    expect(initials('Ferme Dupont')).toBe('FD');
    expect(initials('  ferme   du  grand pre ')).toBe('FD');
  });

  it('garde une seule lettre pour un nom d un mot et rien pour un nom vide', () => {
    expect(initials('Dupont')).toBe('D');
    expect(initials('   ')).toBe('');
  });
});

describe('shownLabels', () => {
  const now = new Date('2026-10-21T10:00:00Z');
  const label = (name: string, verifiedAt: string | null, expiresAt: string | null) => ({ name, verifiedAt, expiresAt });

  it('ne garde que les labels valides par l admin', () => {
    const labels = [label('HVE', '2026-09-22T10:18:03+02:00', null), label('Bio', null, null)];

    expect(shownLabels(labels, now)).toEqual(['HVE']);
  });

  it('retire un label expire et garde celui qui expire plus tard', () => {
    const labels = [
      label('Local', '2026-01-10T00:00:00Z', '2026-10-20T00:00:00Z'),
      label('HVE', '2026-01-10T00:00:00Z', '2027-01-01T00:00:00Z'),
    ];

    expect(shownLabels(labels, now)).toEqual(['HVE']);
  });
});

describe('largestRadius', () => {
  it('prend le plus grand rayon, lu depuis la chaine du back', () => {
    expect(largestRadius([{ radiusKm: '15.00' }, { radiusKm: '40.00' }, { radiusKm: '20.00' }])).toBe(40);
  });

  it('ignore les zones sans rayon et renvoie null sans zone', () => {
    expect(largestRadius([{ radiusKm: null }, { radiusKm: '0.00' }])).toBeNull();
    expect(largestRadius([])).toBeNull();
  });
});

describe('availability', () => {
  it('donne le texte du oui ou du non, et null tant que rien n est configure', () => {
    expect(availability(true, 'À la ferme', 'Non proposé')).toBe('À la ferme');
    expect(availability(false, 'À la ferme', 'Non proposé')).toBe('Non proposé');
    expect(availability(null, 'À la ferme', 'Non proposé')).toBeNull();
  });
});
