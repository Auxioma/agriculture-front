import { MonthCount } from './statistics.service';

const NO_VALUE = '—';

// ex. "Mai", "Juil" : le mois court sans son point, comme sur la maquette. On formate le 15 du mois : jamais a cheval
// sur deux mois, quel que soit le fuseau du navigateur (le 1er a minuit UTC serait la veille a l'ouest de Greenwich).
export function monthLabel(month: string): string {
  const [year, number] = month.split('-').map(Number);
  const short = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(year, number - 1, 15));
  const plain = short.replace(/\.$/, '');
  return plain.charAt(0).toUpperCase() + plain.slice(1);
}

// ex. "87 %" ; un espace insecable pour que le signe ne passe pas seul a la ligne
export const percent = (rate: number | null): string => (rate === null ? NO_VALUE : `${Math.round(rate)} %`);

// ex. "10,00 €" ; sans montant (pas d'abonnement actif) un tiret
export function money(amount: number | null, currency: string | null): string {
  if (amount === null) return NO_VALUE;
  if (!currency) return amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}

// hauteur d'une colonne en pourcentage de la plus haute. Un mois sans demande garde un trait pour qu'on voie sa
// colonne, un petit mois reste visible a cote d'un gros.
export function barPercent(count: number, months: MonthCount[]): number {
  const max = Math.max(0, ...months.map((m) => m.count));
  if (count <= 0 || max === 0) return 3;
  return Math.max(8, Math.round((100 * count) / max));
}
