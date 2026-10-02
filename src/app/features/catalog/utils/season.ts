import { Product } from '../models/product.model';

export function isInSeason(p: Product, month = new Date().getMonth() + 1): boolean {
  const { seasonStartMonth: start, seasonEndMonth: end } = p;
  if (start === null || end === null) return false; // saison inconnue = exclu du filtre
  return start <= end ? month >= start && month <= end : month >= start || month <= end; // saison à cheval sur deux années
}
