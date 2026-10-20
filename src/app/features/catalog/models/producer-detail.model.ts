/** Un label vérifié (Bio, Local…) renvoyé par GET /api/producers/{id} */
export interface ProducerLabelBadge {
  code: string;
  name: string;
}

/** Zone de livraison : seul le rayon est exposé (pas le tracé). radiusKm est un decimal Doctrine, donc une chaîne ("20.00"). */
export interface DeliveryZone {
  radiusKm: string | number | null;
  rules: unknown;
}

/** Horaire d'ouverture : weekday de 1 (lundi) à 7 (dimanche), opensAt/closesAt au format "HH:mm" */
export interface OpeningHour {
  weekday: number | null;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
}

/**
 * Produit proposé par le producteur, avec sa période de disponibilité (mois de 1 à 12) : celle que le producteur a
 * choisie, ou la saison du catalogue à défaut. Les champs optionnels (?) sont ceux que le producteur renseigne (ou non)
 * dans « Produits et disponibilités » : la fiche masque simplement ce qui manque.
 */
export interface ProducerProductSummary {
  id: string;
  name: string;
  seasonStartMonth: number | null;
  seasonEndMonth: number | null;
  variety?: string | null;
  description?: string | null;
  /** Volume estimé, un décimal en texte (« 50.000 »), avec son unité : celle du producteur, ou celle du catalogue */
  quantity?: string | null;
  unit?: { code: string; label: string } | null;
  /** Prix indicatif, un décimal en texte (« 3.50 »), par unité */
  price?: string | null;
  currencyCode?: string | null;
  /** Labels DÉCLARÉS par le producteur pour ce produit, non vérifiés : à ne pas confondre avec ProducerDetail.labels */
  labels?: ProducerLabelBadge[];
  photos?: { url: string; alt: string | null }[];
}

/**
 * Réponse de GET /api/producers/{id}.
 * Les champs optionnels (?) ne sont PAS encore renvoyés par l'API : la page les affiche dès qu'ils arrivent,
 * sans modification du front, et masque simplement la section correspondante en attendant.
 */
export interface ProducerDetail {
  id: string;
  slug: string;
  farmName: string;
  description: string | null;
  story: string | null;
  city: string | null;
  countryCode: string | null;
  verificationStatus: string;
  deliveryZones: DeliveryZone[];
  openingHours: OpeningHour[];
  labels: ProducerLabelBadge[];
  photoUrl?: string | null;
  averageRating?: number | null;
  reviewCount?: number;
  products?: ProducerProductSummary[];
  pickupAvailable?: boolean;
  deliveryAvailable?: boolean;
}

export interface ProducerReview {
  id: string;
  rating: number | null;
  comment: string | null;
  producerResponse: string | null;
  /** date ISO 8601 */
  createdAt: string;
  /** « Camille R. » : pas encore renvoyé par l'API */
  authorName?: string | null;
}

/** Réponse de GET /api/producers/{id}/reviews */
export interface ProducerReviews {
  averageRating: number | null;
  count: number;
  reviews: ProducerReview[];
}
