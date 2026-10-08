import { AvailableRequest } from './dashboard/dashboard.model';

const UNITS: Record<string, string> = { kg: 'kg', unite: 'unité' };
const CLIENT_TYPES = { individual: 'Particulier', professional: 'Professionnel' };

type Quantified = Pick<AvailableRequest, 'quantity' | 'unit'>;

export const unitLabel = (request: Quantified): string => UNITS[request.unit ?? ''] ?? request.unit ?? '';

// ex. "5kg", "2 unités" etc ; spaced : "5 kg" (page de detail)
export const requestQuantity = (request: Quantified, spaced = false): string => {
  if (unitLabel(request) === 'kg') return `${request.quantity}${spaced ? ' ' : ''}kg`;
  const plural = unitLabel(request) === 'unité' && request.quantity! > 1 ? 's' : '';
  return `${request.quantity} ${unitLabel(request)}${plural}`.trim();
};

// ex. "18 août", "1er septembre
export const shortDate = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getDate() === 1 ? '1er' : date.getDate()} ${new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(date)}`;
};

// ex. "23 août 2026"
export const longDate = (iso: string): string => `${shortDate(iso)} ${new Date(iso).getFullYear()}`;

// ex. "Tomates bio - 5kg"
export function requestTitle(request: AvailableRequest): string {
  const product = request.product ?? 'Demande';
  return request.quantity === null ? product : `${product} - ${requestQuantity(request)}`;
}

// ex. "Lyon · 4 km · budget 12€/kg". Au dashboard, le message du client remplace le budget quand il n'y en a
// pas, dans la liste des demandes (forList), on ajoute le type de client et on n'affiche pas le message.
export function requestDetails(request: AvailableRequest, forList = false): string {
  const budget =
    request.budgetMax !== null
      ? `budget ${request.budgetMax}${request.currency ?? ''}${request.unit ? `/${unitLabel(request)}` : ''}`
      : forList
        ? null
        : request.message;

  return [
    request.city,
    request.distanceKm !== null ? `${request.distanceKm} km` : null,
    forList ? CLIENT_TYPES[request.clientType] : null,
    budget,
  ]
    .filter((part) => !!part)
    .join(' · ');
}
