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

/** Nombre de producteurs par page (le back accepte jusqu'à 50 ; 12 par défaut) */
export const PRODUCERS_PAGE_SIZE = 12;

/** Une page de résultats + le nombre total de producteurs, toutes pages confondues (en-tête X-Total-Count) */
export interface ProducerPage {
  items: ProducerSummary[];
  total: number;
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
  /** Numéro de la page demandée, à partir de 1 */
  page: number;
}

/** Les filtres seuls, sans la page : changer un filtre ramène à la page 1 */
export type ProducerFilters = Omit<ProducerQuery, 'page'>;
