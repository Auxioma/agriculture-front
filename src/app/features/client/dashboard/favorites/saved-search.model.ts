/**
 * Ce qu'on retient d'une recherche : les paramètres de l'adresse /producers (voir ProducersComponent).
 * Le back stocke ces critères tels quels, sans les valider (SaveSearchRequest).
 */
export interface SavedSearchCriteria {
  q?: string;
  near?: string;
  categoryId?: string;
  productId?: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  criteria: SavedSearchCriteria | null;
  notificationsEnabled: boolean;
  createdAt: string;
}
