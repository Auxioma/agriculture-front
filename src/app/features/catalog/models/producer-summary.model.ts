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
  photoUrl?: string | null;
  averageRating?: number | null;
  reviewCount?: number;
  labels?: Pick<Label, 'code' | 'name'>[];
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type ProducerSort = 'relevance' | 'distance';

export interface ProducerQuery {
  categoryId: string;
  location: string;
  radius: number;
  pickup: boolean;
  delivery: boolean;
  label: string | null;
  verifiedOnly: boolean;
  sort: ProducerSort;
}
