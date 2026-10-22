import { describe, it, expect } from 'vitest';
import { availability, initials, kmText, labelStatus, largestRadius, parseKm, sameCity, shownLabels } from './profile-format';

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
  const label = (name: string, verifiedAt: string | null, expiresAt: string | null) => ({ labelId: name, name, verifiedAt, expiresAt });

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
  const zone = (radiusKm: string | null) => ({ id: 'z', radiusKm, rules: null });

  it('prend le plus grand rayon, lu depuis la chaine du back', () => {
    expect(largestRadius([zone('15.00'), zone('40.00'), zone('20.00')])).toBe(40);
  });

  it('ignore les zones sans rayon et renvoie null sans zone', () => {
    expect(largestRadius([zone(null), zone('0.00')])).toBeNull();
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

describe('labelStatus', () => {
  const now = new Date('2026-10-21T10:00:00Z');
  const claimed = (verifiedAt: string | null, expiresAt: string | null) => ({ labelId: 'l1', name: 'Bio', verifiedAt, expiresAt });

  it('ne dit rien d un label non revendique', () => {
    expect(labelStatus(undefined, now)).toBeNull();
  });

  it('distingue en attente, valide et expire', () => {
    expect(labelStatus(claimed(null, null), now)).toBe('En attente de validation');
    expect(labelStatus(claimed('2026-09-22T10:00:00Z', null), now)).toBe('Validé');
    expect(labelStatus(claimed('2026-09-22T10:00:00Z', '2027-01-01T00:00:00Z'), now)).toBe('Validé');
    expect(labelStatus(claimed('2026-01-10T00:00:00Z', '2026-10-20T00:00:00Z'), now)).toBe('Expiré');
  });
});

describe('parseKm', () => {
  it('lit les nombres avec une virgule ou un point', () => {
    expect(parseKm('20')).toBe(20);
    expect(parseKm(' 12,5 ')).toBe(12.5);
    expect(parseKm('12.5')).toBe(12.5);
  });

  it('renvoie null pour un champ vide et NaN pour du texte', () => {
    expect(parseKm('')).toBeNull();
    expect(parseKm('   ')).toBeNull();
    expect(parseKm('vingt')).toBeNaN();
  });
});

describe('kmText', () => {
  it('ecrit le nombre a la francaise', () => {
    expect(kmText(40)).toBe('40');
    expect(kmText(12.5)).toBe('12,5');
  });
});

describe('sameCity', () => {
  it('ignore la casse et les espaces autour', () => {
    expect(sameCity(' lyon ', 'Lyon')).toBe(true);
    expect(sameCity('Lyon', 'Lille')).toBe(false);
    expect(sameCity('Lyon', '')).toBe(false);
  });
});
