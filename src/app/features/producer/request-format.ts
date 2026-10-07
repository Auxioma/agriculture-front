import { AvailableRequest } from './dashboard/dashboard.model';

const UNITS: Record<string, string> = { kg: 'kg', unite: 'unité' };
const CLIENT_TYPES = { individual: 'Particulier', professional: 'Professionnel' };

const unit = (request: AvailableRequest): string => UNITS[request.unit ?? ''] ?? request.unit ?? '';

const quantity = (request: AvailableRequest): string => {
  if (unit(request) === 'kg') return `${request.quantity}kg`;
  const plural = unit(request) === 'unité' && request.quantity! > 1 ? 's' : '';
  return `${request.quantity} ${unit(request)}${plural}`.trim();
};

// ex. "Tomates bio - 5kg"
export function requestTitle(request: AvailableRequest): string {
  const product = request.product ?? 'Demande';
  return request.quantity === null ? product : `${product} - ${quantity(request)}`;
}

// ex. "Lyon · 4 km · budget 12€/kg". Au dashboard, le message du client remplace le budget quand il n'y en a
// pas ; dans la liste des demandes (forList), on ajoute le type de client et on n'affiche pas le message.
export function requestDetails(request: AvailableRequest, forList = false): string {
  const budget =
    request.budgetMax !== null
      ? `budget ${request.budgetMax}${request.currency ?? ''}${request.unit ? `/${unit(request)}` : ''}`
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
