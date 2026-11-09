import { describe, it, expect } from 'vitest';
import { MONTH_OPTIONS, productDetails, productTitle, seasonLabel, unitText } from './product-format';
import { ProducerProduct } from './products.service';

const product = (overrides: Partial<ProducerProduct> = {}): ProducerProduct => ({
  id: 'pp1',
  productId: 'p1',
  name: 'Tomates',
  variety: null,
  description: null,
  estimatedVolume: null,
  defaultPrice: null,
  currencyCode: null,
  isActive: true,
  unit: null,
  seasonStartMonth: null,
  seasonEndMonth: null,
  availability: null,
  labels: [],
  photos: [],
  ...overrides,
});

const KG = { id: 'u-kg', code: 'kg', label: 'Kilogramme' };
const UNITE = { id: 'u-unite', code: 'unite', label: 'Unité' };

// les espaces insecables de l'Intl deviennent des espaces simples
const plain = (text: string) => text.replace(/\s/g, ' ');

describe('seasonLabel', () => {
  it('donne le premier et le dernier mois de la saison', () => {
    expect(seasonLabel(6, 9)).toBe('Juin-Sept');
    expect(seasonLabel(5, 10)).toBe('Mai-Oct');
    expect(seasonLabel(9, 3)).toBe('Sept-Mars');
  });

  it('un seul mois : juste le mois', () => {
    expect(seasonLabel(7, 7)).toBe('Juil');
    expect(seasonLabel(7, null)).toBe('Juil');
    expect(seasonLabel(null, 4)).toBe('Avr');
  });

  it('sans saison dans le catalogue, ou de janvier a decembre : toute l\'annee', () => {
    expect(seasonLabel(null, null)).toBe("Toute l'année");
    expect(seasonLabel(1, 12)).toBe("Toute l'année");
  });

  it('un mois hors 1-12 saisi dans l\'admin n\'ecrit pas "undefined"', () => {
    expect(seasonLabel(0, 13)).toBe("Toute l'année");
    expect(seasonLabel(13, 5)).toBe('Mai');
  });
});

describe('unitText', () => {
  it('kg tel quel, unité au pluriel à partir de 2', () => {
    expect(unitText('kg', 50)).toBe('kg');
    expect(unitText('unite')).toBe('unité');
    expect(unitText('unite', 1)).toBe('unité');
    expect(unitText('unite', 30)).toBe('unités');
  });
});

describe('productTitle', () => {
  it('le produit, puis sa variété si elle existe', () => {
    expect(productTitle(product({ variety: 'Cœur de bœuf' }))).toBe('Tomates · Cœur de bœuf');
    expect(productTitle(product())).toBe('Tomates');
  });
});

describe('productDetails', () => {
  it('saison, volume et prix, comme le figma', () => {
    const tomatoes = product({
      estimatedVolume: '90.000',
      defaultPrice: '3.50',
      currencyCode: 'EUR',
      unit: KG,
      seasonStartMonth: 6,
      seasonEndMonth: 9,
    });

    expect(plain(productDetails(tomatoes))).toBe('Juin-Sept · 90 kg · 3,50 €/kg');
  });

  it('ce qui n\'est pas renseigné n\'apparaît pas', () => {
    expect(productDetails(product())).toBe("Toute l'année");
    expect(plain(productDetails(product({ defaultPrice: '2.00', unit: KG })))).toBe("Toute l'année · 2,00 €/kg");
    expect(productDetails(product({ estimatedVolume: '12.000', unit: KG }))).toBe("Toute l'année · 12 kg");
  });

  it('les décimales du volume gardent la virgule française, sans zéros inutiles', () => {
    expect(productDetails(product({ estimatedVolume: '87.500', unit: KG }))).toContain('87,5 kg');
  });

  it('une unité « unité » passe au pluriel', () => {
    expect(productDetails(product({ estimatedVolume: '30.000', unit: UNITE }))).toContain('30 unités');
  });

  it('sans unité dans le catalogue : volume sans unité et prix sans « /unité »', () => {
    const withoutUnit = product({ estimatedVolume: '90.000', defaultPrice: '3.50', currencyCode: 'EUR' });

    expect(plain(productDetails(withoutUnit))).toBe("Toute l'année · volume 90 · 3,50 €");
  });

  it('un prix sans devise est en euros', () => {
    expect(plain(productDetails(product({ defaultPrice: '15.22' })))).toContain('15,22 €');
  });
});

describe('productDetails avec la période du producteur', () => {
  const withSlot = (slot: Partial<NonNullable<ProducerProduct['availability']>>) =>
    product({
      seasonStartMonth: 6,
      seasonEndMonth: 9,
      estimatedVolume: '90.000',
      unit: KG,
      availability: { startMonth: 3, endMonth: 5, quantity: '50.000', unit: UNITE, ...slot },
    });

  it("sa période, son volume et son unité l'emportent sur ceux du catalogue", () => {
    expect(plain(productDetails({ ...withSlot({}), defaultPrice: '3.50' }))).toBe('Mars-Mai · 50 unités · 3,50 €/unité');
  });

  it('un créneau sans mois garde la saison du catalogue, un créneau sans volume celui de la fiche', () => {
    expect(productDetails(withSlot({ startMonth: null, endMonth: null, quantity: null }))).toBe('Juin-Sept · 90 unités');
  });

  it("un créneau sans unité retombe sur l'unité du catalogue", () => {
    expect(productDetails(withSlot({ unit: null }))).toBe('Mars-Mai · 50 kg');
  });
});

describe('MONTH_OPTIONS', () => {
  it('douze mois, de 1 à 12', () => {
    expect(MONTH_OPTIONS).toHaveLength(12);
    expect(MONTH_OPTIONS[0]).toEqual({ value: 1, label: 'Janvier' });
    expect(MONTH_OPTIONS[11]).toEqual({ value: 12, label: 'Décembre' });
  });
});
