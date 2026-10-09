import { unitLabel } from '../../request-format';

// un badge par statut de reponse (cahier fonctionnel, statuts d'une reponse)
const BADGES: Record<string, { label: string; style: string }> = {
  sent: { label: 'Envoyée', style: 'border border-primary text-primary' },
  seen: { label: 'Vue', style: 'border border-grey-400 text-grey-700' },
  accepted: { label: 'Acceptée', style: 'bg-success text-white' },
  declined: { label: 'Refusée', style: 'bg-danger text-white' },
  expired: { label: 'Expirée', style: 'border border-grey-400 text-grey-500' },
  archived: { label: 'Archivée', style: 'border border-grey-400 text-grey-500' },
};

export const quoteBadge = (status: string): { label: string; style: string } =>
  BADGES[status] ?? { label: status, style: 'border border-grey-400 text-grey-700' };

// ex. "12 €/kg", "1,20 €/kg"
export const formatPrice = (amount: number, currency: string | null, unit: string | null): string => {
  const text = Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace('.', ',');
  return `${text} ${currency ?? '€'}${unit ? `/${unitLabel({ unit, quantity: null })}` : ''}`;
};

// duree de validite en jours ("7 jours") : de la date d'envoi (jour local) a la date de fin (date sans heure)
export const validityDays = (sentAt: string, validUntil: string): number =>
  Math.round((Date.parse(validUntil.slice(0, 10)) - Date.parse(new Date(sentAt).toLocaleDateString('sv-SE'))) / 86_400_000);
