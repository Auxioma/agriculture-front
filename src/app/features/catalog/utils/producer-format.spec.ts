import { OpeningHour } from '../models/producer-detail.model';
import {
  availabilityLabel,
  formatRadius,
  labelBadgeClass,
  summarizeOpeningHours,
} from './producer-format';

const hour = (
  weekday: number,
  opensAt: string,
  closesAt: string,
  isClosed = false,
): OpeningHour => ({
  weekday,
  opensAt,
  closesAt,
  isClosed,
});

describe('availabilityLabel', () => {
  it("indique une disponibilité toute l'année", () => {
    expect(availabilityLabel(1, 12)).toBe("Disponible toute l'année");
    expect(availabilityLabel(3, 2)).toBe("Disponible toute l'année");
  });

  it('formate une période normale', () => {
    expect(availabilityLabel(6, 9)).toBe('Disponible de juin à septembre');
  });

  it('élide « de » devant avril, août et octobre', () => {
    expect(availabilityLabel(4, 9)).toBe("Disponible d'avril à septembre");
    expect(availabilityLabel(8, 11)).toBe("Disponible d'août à novembre");
    expect(availabilityLabel(10, 12)).toBe("Disponible d'octobre à décembre");
  });

  it('formate une période à cheval sur deux années', () => {
    expect(availabilityLabel(11, 2)).toBe('Disponible de novembre à février');
  });

  it('formate un mois unique', () => {
    expect(availabilityLabel(5, 5)).toBe('Disponible en mai');
  });

  it('renvoie null si la période est inconnue ou invalide', () => {
    expect(availabilityLabel(null, 3)).toBeNull();
    expect(availabilityLabel(3, null)).toBeNull();
    expect(availabilityLabel(0, 3)).toBeNull();
    expect(availabilityLabel(3, 13)).toBeNull();
  });
});

describe('summarizeOpeningHours', () => {
  it('regroupe les jours consécutifs aux mêmes horaires', () => {
    const hours = [1, 2, 3, 4, 5, 6].map((day) => hour(day, '09:00', '18:00'));

    expect(summarizeOpeningHours(hours)).toBe('Lun-Sam 9h-18h');
  });

  it('sépare les groupes aux horaires différents', () => {
    const hours = [
      ...[1, 2, 3, 4, 5].map((day) => hour(day, '09:00', '18:00')),
      hour(6, '09:00', '12:30'),
    ];

    expect(summarizeOpeningHours(hours)).toBe('Lun-Ven 9h-18h · Sam 9h-12h30');
  });

  it('ne regroupe pas des jours séparés par un jour fermé', () => {
    const hours = [
      hour(1, '09:00', '18:00'),
      hour(2, '00:00', '00:00', true),
      hour(3, '09:00', '18:00'),
    ];

    expect(summarizeOpeningHours(hours)).toBe('Lun 9h-18h · Mer 9h-18h');
  });

  it('gère une coupure méridienne', () => {
    const hours = [hour(1, '09:00', '12:00'), hour(1, '14:00', '18:00')];

    expect(summarizeOpeningHours(hours)).toBe('Lun 14h-18h / 9h-12h');
  });

  it("renvoie null sans créneau d'ouverture", () => {
    expect(summarizeOpeningHours([])).toBeNull();
    expect(summarizeOpeningHours([hour(1, '09:00', '18:00', true)])).toBeNull();
  });
});

describe('formatRadius', () => {
  it('formate un rayon entier ou décimal', () => {
    expect(formatRadius(20)).toBe('Rayon de 20 km');
    expect(formatRadius(12.5)).toBe('Rayon de 12,5 km');
  });
});

describe('labelBadgeClass', () => {
  it('donne une couleur propre à bio et local, et une couleur neutre aux autres', () => {
    expect(labelBadgeClass('bio')).toContain('bg-agri');
    expect(labelBadgeClass('local')).toContain('bg-earth');
    expect(labelBadgeClass('hve')).toContain('bg-badge-bg');
  });
});
