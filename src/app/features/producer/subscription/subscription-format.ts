import { BillingCycle } from './subscription.service';

// ex. "24 €", "19,50 €"
export const formatMoney = (amount: string | null, currency: string | null): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency ?? 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount ?? 0));

// ex. "24 €/mois", "240 €/an"
export const formatPrice = (amount: string | null, currency: string | null, cycle: BillingCycle): string =>
  `${formatMoney(amount, currency)}/${cycle === 'yearly' ? 'an' : 'mois'}`;

// economie de l'annuel par rapport a 12 mensualites, en % (null si inconnue ou nulle)
export const annualSaving = (monthly: string | null, yearly: string | null): number | null => {
  // sans prix mensuel ou sans prix annuel, rien a comparer (Number(null) vaut 0 : on annoncerait 100 %)
  if (!(Number(monthly) > 0) || !(Number(yearly) > 0)) return null;
  const saving = Math.round((1 - Number(yearly) / (Number(monthly) * 12)) * 100);
  return saving > 0 ? saving : null;
};

const BRANDS: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };

// ex. "Visa", "Carte bancaire" quand la marque est inconnue
export const cardBrand = (brand: string | null): string => BRANDS[brand ?? ''] ?? 'Carte bancaire';
