import { OpeningHour } from '../models/producer-detail.model';
import {
  availabilityLabel,
  formatRadius,
  labelBadgeClass,
  productPrice,
  productQuantity,
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

describe('productQuantity', () => {
  const kg = { code: 'kg', label: 'Kilogramme' };
  const piece = { code: 'unite', label: 'Unité' };

  it('donne le volume avec son unité, sans zéros inutiles', () => {
    expect(productQuantity({ quantity: '50.000', unit: kg })).toBe('50 kg');
    expect(productQuantity({ quantity: '12.500', unit: kg })).toBe('12,5 kg');
  });

  it("met « unité » au pluriel à partir de 2", () => {
    expect(productQuantity({ quantity: '1', unit: piece })).toBe('1 unité');
    expect(productQuantity({ quantity: '30', unit: piece })).toBe('30 unités');
  });

  it("dit « volume » quand il n'y a pas d'unité, et rien sans volume", () => {
    expect(productQuantity({ quantity: '50', unit: null })).toBe('volume 50');
    expect(productQuantity({ quantity: null, unit: kg })).toBeNull();
    expect(productQuantity({ unit: kg })).toBeNull();
    expect(productQuantity({ quantity: 'abc', unit: kg })).toBeNull();
  });
});

describe('productPrice', () => {
  const kg = { code: 'kg', label: 'Kilogramme' };
  // * l'espace avant « € » est insécable : on le compare comme une espace simple
  const plain = (text: string | null) => text?.replace(/\s/g, ' ');

  it('donne le prix par unité, toujours avec deux décimales', () => {
    expect(plain(productPrice({ price: '3.50', currencyCode: 'EUR', unit: kg }))).toBe('3,50 €/kg');
    expect(plain(productPrice({ price: '12', currencyCode: 'EUR', unit: kg }))).toBe('12,00 €/kg');
  });

  it("n'ajoute rien sans unité, et prend l'euro sans devise", () => {
    expect(plain(productPrice({ price: '3.5', currencyCode: null, unit: null }))).toBe('3,50 €');
  });

  it('ne dit rien sans prix', () => {
    expect(productPrice({ price: null, currencyCode: 'EUR', unit: kg })).toBeNull();
    expect(productPrice({})).toBeNull();
  });
});
