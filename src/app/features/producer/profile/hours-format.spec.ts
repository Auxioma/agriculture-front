import { describe, it, expect } from 'vitest';
import { hoursError, slotsFromApi } from './hours-format';

const slot = (weekday: number, opensAt: string, closesAt: string) => ({ weekday, opensAt, closesAt });

describe('slotsFromApi', () => {
  it('garde les creneaux ouverts, tries par jour puis par heure', () => {
    const hours = [
      { weekday: 6, opensAt: '09:00', closesAt: '13:00', isClosed: false },
      { weekday: 1, opensAt: '14:00', closesAt: '18:00', isClosed: false },
      { weekday: 1, opensAt: '08:00', closesAt: '12:00', isClosed: false },
    ];

    expect(slotsFromApi(hours)).toEqual([slot(1, '08:00', '12:00'), slot(1, '14:00', '18:00'), slot(6, '09:00', '13:00')]);
  });

  it('ignore les jours fermes et les lignes sans jour ni heures', () => {
    const hours = [
      { weekday: 7, opensAt: null, closesAt: null, isClosed: true },
      { weekday: 3, opensAt: '09:00', closesAt: '18:00', isClosed: true },
      { weekday: null, opensAt: '09:00', closesAt: '18:00', isClosed: false },
      { weekday: 0, opensAt: '09:00', closesAt: '18:00', isClosed: false },
      { weekday: 8, opensAt: '09:00', closesAt: '18:00', isClosed: false },
      { weekday: 2, opensAt: null, closesAt: '18:00', isClosed: false },
    ];

    expect(slotsFromApi(hours)).toEqual([]);
  });
});

describe('hoursError', () => {
  it('ne trouve rien a redire a des horaires corrects, ni a une semaine vide', () => {
    expect(hoursError([slot(1, '08:00', '12:00'), slot(1, '14:00', '18:00'), slot(2, '09:00', '18:00')])).toBeNull();
    expect(hoursError([])).toBeNull();
  });

  it('refuse une heure manquante et nomme le jour', () => {
    expect(hoursError([slot(2, '', '18:00')])).toBe("Mardi : indiquez l'ouverture et la fermeture.");
    expect(hoursError([slot(3, '09:00', '')])).toBe("Mercredi : indiquez l'ouverture et la fermeture.");
  });

  it('refuse une fermeture avant ou a la meme heure que l ouverture', () => {
    expect(hoursError([slot(1, '18:00', '09:00')])).toBe("Lundi : l'ouverture doit précéder la fermeture.");
    expect(hoursError([slot(7, '09:00', '09:00')])).toBe("Dimanche : l'ouverture doit précéder la fermeture.");
  });

  it('refuse deux creneaux du meme jour qui se chevauchent, mais pas deux qui se touchent', () => {
    expect(hoursError([slot(4, '09:00', '13:00'), slot(4, '12:00', '18:00')])).toBe('Jeudi : deux créneaux se chevauchent.');
    expect(hoursError([slot(4, '09:00', '12:00'), slot(4, '12:00', '18:00')])).toBeNull();
  });

  it('ne confond pas deux jours differents qui se recouvrent', () => {
    expect(hoursError([slot(1, '09:00', '18:00'), slot(2, '09:00', '18:00')])).toBeNull();
  });
});
