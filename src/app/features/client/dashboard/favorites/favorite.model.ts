export type FavoriteType = 'producer_profile' | 'product' | 'category';

export interface FavoriteTarget {
  id: string;
  name?: string;
  farmName?: string;
  slug: string;
  city?: string | null;
  verified?: boolean;
}

export interface Favorite {
  id: string;
  targetType: FavoriteType;
  targetId: string | null;
  createdAt: string;
  target: FavoriteTarget | null; // null = cible supprimée
}
