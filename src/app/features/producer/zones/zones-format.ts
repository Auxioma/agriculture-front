import { ProfileZone } from '../profile/profile.service';
import { kmText } from '../profile/profile-format';
import { money } from '../statistics/statistics-format';

// les conditions d'une zone sont gardees dans ses "rules" sous ces deux noms (comme les zones deja en base)
const FEE = 'frais';
const MINIMUM = 'minimum';

// "3,5", "3.50" ou "3" --> nombre, null si vide, NaN pour tout le reste (lettres, negatif, plus de deux decimales)
export function parseAmount(text: string): number | null {
  const value = text.trim().replace(',', '.');
  if (value === '') return null;

  return /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : NaN;
}

// un montant lu dans les conditions ; absent, vide ou illisible = null
const amountOf = (rules: ProfileZone['rules'], key: string): number | null => {
  const raw = rules?.[key];
  if (raw === undefined || raw === null || raw === '') return null;
  const value = Number(raw);

  return Number.isFinite(value) ? value : null;
};

// ce que le champ montre pour une condition deja enregistree : "3.00" --> "3", "6.50" --> "6,5"
export function amountField(zone: ProfileZone, key: 'fee' | 'minimum'): string {
  const value = amountOf(zone.rules, key === 'fee' ? FEE : MINIMUM);

  return value === null ? '' : kmText(value);
}

// "Jusqu'a 15 km", ou "Zone tracee" pour une zone sans rayon (dessinee a la main, rien dans l'interface n'en cree)
export function zoneTitle(zone: ProfileZone): string {
  const km = Number(zone.radiusKm);

  return zone.radiusKm !== null && Number.isFinite(km) ? `Jusqu'à ${kmText(km)} km` : 'Zone tracée';
}

// ex. ["Frais de livraison : 3,00 €", "Commande minimum : 20,00 €"] ; vide si rien n'est indique
export function conditions(zone: ProfileZone): string[] {
  const fee = amountOf(zone.rules, FEE);
  const minimum = amountOf(zone.rules, MINIMUM);

  return [fee === null ? null : `Frais de livraison : ${money(fee, 'EUR')}`, minimum === null ? null : `Commande minimum : ${money(minimum, 'EUR')}`].filter(
    (line): line is string => line !== null,
  );
}

// les conditions a envoyer : celles que la zone avait deja (autres cles comprises), avec frais et minimum remplaces. Un champ
// vide retire la condition ; plus aucune condition = null
export function buildRules(existing: ProfileZone['rules'], fee: number | null, minimum: number | null): Record<string, unknown> | null {
  const rules: Record<string, unknown> = { ...existing };
  delete rules[FEE];
  delete rules[MINIMUM];
  if (fee !== null) rules[FEE] = fee.toFixed(2);
  if (minimum !== null) rules[MINIMUM] = minimum.toFixed(2);

  return Object.keys(rules).length > 0 ? rules : null;
}

// la plus petite zone d'abord ; une zone sans rayon en dernier
export const byRadius = (a: ProfileZone, b: ProfileZone): number => Number(a.radiusKm ?? Infinity) - Number(b.radiusKm ?? Infinity);
