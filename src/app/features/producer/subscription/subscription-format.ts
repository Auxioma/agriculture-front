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

const BRANDS: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };

// ex. "Visa", "Carte bancaire" quand la marque est inconnue
export const cardBrand = (brand: string | null): string => BRANDS[brand ?? ''] ?? 'Carte bancaire';
