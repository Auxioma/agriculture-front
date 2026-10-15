export interface Label {
  id: string;
  code: string;
  name: string;
  decriptions: string | null;
}

export interface ProducerSummary {
  id: string;
  slug: string;
  farmName: string;
  city: string | null;
  countryCode: string | null;
  verificationStatus: string;
  distanceKm: number | null;
  photoUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  labels: Pick<Label, 'code' | 'name'>[];
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type ProducerSort = 'relevance' | 'distance' | 'popularity' | 'newest';

export interface ProducerQuery {
  /** null = pas de filtre de catégorie : tous les producteurs actifs (page Producteurs) */
  categoryId: string | null;
  location: string;
  radius: number;
  seasonalOnly: boolean;
  pickup: boolean;
  delivery: boolean;
  labels: string[];
  verifiedOnly: boolean;
  minRating: number | null;
  sort: ProducerSort;
}
