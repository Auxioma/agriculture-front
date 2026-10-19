import { Category } from '../models/category.model';
import { ProducerDetail, ProducerReview, ProducerReviews } from '../models/producer-detail.model';
import { Label, ProducerSummary } from '../models/producer-summary.model';
import { Product } from '../models/product.model';

// ─────────────── Aides communes aux tests de la feature catalogue ───────────────

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * La page producteurs attend 200 ms (debounce) avant de lancer une recherche. On attend 250 ms avec un vrai
 * minuteur plutôt qu'une horloge simulée : cela fonctionne à l'identique avec Jasmine, Vitest, avec ou sans zone.js.
 */
export const SEARCH_DEBOUNCE_WAIT_MS = 250;

/** Le texte visible d'un élément, espaces et retours à la ligne réduits à un seul espace */
export const textOf = (element: Element | null | undefined): string =>
  (element?.textContent ?? '').replace(/\s+/g, ' ').trim();

export const currentMonth = (): number => new Date().getMonth() + 1;
export const nextMonth = (month: number): number => (month % 12) + 1;

// ─────────────── Fabriques de données (les valeurs par défaut sont valides ; on ne surcharge que l'utile) ───────────────

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'c1',
    name: 'Fruits',
    slug: 'fruits',
    icon: null,
    imageUrl: null,
    parentId: null,
    description: null,
    seoTitle: null,
    seoDescription: null,
    producerCount: 3,
    ...overrides,
  };
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'pr1',
    name: 'Pommes',
    slug: 'pommes',
    categoryId: 'c1',
    seasonStartMonth: null,
    seasonEndMonth: null,
    description: null,
    keywords: null,
    ...overrides,
  };
}

export function makeLabel(overrides: Partial<Label> = {}): Label {
  return { id: 'l1', code: 'bio', name: 'Bio', decriptions: null, ...overrides };
}

export function makeProducerSummary(overrides: Partial<ProducerSummary> = {}): ProducerSummary {
  return {
    id: 'p1',
    slug: 'ferme-des-vergers-du-roy',
    farmName: 'Ferme des Vergers du Roy',
    city: 'Avignon',
    countryCode: 'FR',
    verificationStatus: 'verified',
    distanceKm: null,
    photoUrl: null,
    averageRating: null,
    reviewCount: 0,
    labels: [],
    ...overrides,
  };
}

export function makeProducerDetail(overrides: Partial<ProducerDetail> = {}): ProducerDetail {
  return {
    id: 'p1',
    slug: 'ferme-des-vergers-du-roy',
    farmName: 'Ferme des Vergers du Roy',
    description: 'Une ferme locale',
    story: null,
    city: 'Avignon',
    countryCode: 'FR',
    verificationStatus: 'verified',
    deliveryZones: [],
    openingHours: [],
    labels: [],
    ...overrides,
  };
}

export function makeReview(overrides: Partial<ProducerReview> = {}): ProducerReview {
  return {
    id: 'r1',
    rating: 5,
    comment: 'Excellent',
    producerResponse: null,
    createdAt: '2026-08-10T10:00:00+00:00',
    authorName: null,
    ...overrides,
  };
}

export function makeReviews(
  reviews: ProducerReview[],
  averageRating: number | null = 4.5,
): ProducerReviews {
  return { averageRating, count: reviews.length, reviews };
}
