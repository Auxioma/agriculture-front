// Types partagés par tout le tunnel de demande.
// Les noms de champs reprennent exactement ceux de CreateClientRequestRequest.php (Symfony).

export type NeedType = 'one_shot' | 'quote_request' | 'recurring';

// Les 3 cartes de la maquette (étape 2). Les valeurs doivent exister dans l'enum PHP App\Enum\NeedType.
export const NEED_OPTIONS: ReadonlyArray<{ value: NeedType; title: string; subtitle: string }> = [
  { value: 'one_shot', title: 'Achat ponctuel', subtitle: 'Une commande unique' },
  { value: 'quote_request', title: 'Devis', subtitle: 'Pour un volume précis' },
  { value: 'recurring', title: 'Demande récurrente', subtitle: 'Livraison régulière' },
];

export const RADIUS_OPTIONS: readonly number[] = [5, 10, 20, 30, 50, 100];

// --- Réponses de l'API (sous-ensemble des champs utilisés par le tunnel) ---

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
}

export interface Label {
  id: string;
  code: string;
  name: string;
}

// Nécessite GET /api/units côté Symfony (voir symfony/UnitController.php).
export interface Unit {
  id: string;
  code: string; // ex. "kg" (toujours renseigné)
  label: string | null; // ex. "Kilogramme" (facultatif côté entité)
}

export interface AddressSuggestion {
  label: string;
  city: string;
  postalCode: string | null;
  latitude: number;
  longitude: number;
}

// --- Brouillon de la demande (ce que l'utilisateur remplit étape par étape) ---

export interface RequestDraft {
  // Étape 1
  categoryId: string | null;
  categoryLabel: string | null; // *Label = texte affiché dans le récapitulatif, jamais envoyé à l'API
  productId: string | null;
  customProduct: string | null;
  productLabel: string | null;
  labels: string[]; // labels souhaités (bio, local...) : pas de champ côté API, fusionnés dans le message
  // Étape 2
  needType: NeedType | null;
  // Étape 3
  quantity: number | null;
  unitId: string | null;
  unitLabel: string | null;
  budgetMax: number | null;
  desiredDate: string | null; // 'YYYY-MM-DD'
  quality: string | null; // préférence qualité : pas de champ côté API, fusionnée dans le message
  // Étape 4
  addressText: string | null;
  city: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  pickupWanted: boolean;
  deliveryWanted: boolean;
  // Étape 5
  message: string | null;
}

// --- Payload envoyé à POST /api/requests ---
// ATTENTION : quantity, budgetMin, budgetMax et radiusKm sont des STRING côté PHP (?string).
// currencyCode et countryCode ne sont pas envoyés : le backend applique EUR et FR par défaut.
export interface CreateRequestPayload {
  needType: NeedType;
  categoryId: string | null;
  productId: string | null;
  customProduct: string | null;
  quantity: string | null;
  unitId: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  desiredDate: string | null;
  urgencyLevel: number;
  city: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusKm: string | null;
  pickupWanted: boolean;
  deliveryWanted: boolean;
  message: string | null;
}
