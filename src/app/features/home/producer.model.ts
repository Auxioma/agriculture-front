export interface FeaturedProducer {
  id: string;
  farmName: string;
  slug: string;
  city: string | null;
  countryCode: string | null;
  distanceKm: number | null;
  averageRating: number;
  reviewCount: number;
  photoUrl: string | null;
  labels: { code: string; name: string }[];
}
