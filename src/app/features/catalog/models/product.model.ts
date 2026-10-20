export interface Product {
  id: string;
  name: string;
  slug: string | null;
  categoryId: string;
  seasonStartMonth: number | null;
  seasonEndMonth: number | null;
  description: string | null;
  keywords: string[] | null;
}
