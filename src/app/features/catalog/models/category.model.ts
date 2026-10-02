export interface Category {
  id: string;
  name: string;
  slug: string | null;
  icon: string | null;
  imageUrl: string | null;
  parentId: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  producerCount?: number;
}
