import { unitLabel } from '../request-format';
import { ProducerProduct } from './products.service';

const MONTHS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
const isMonth = (month: number | null): month is number => month !== null && month >= 1 && month <= 12;

// pour les listes deroulantes de la periode : { value: 1, label: 'Janvier' }...
export const MONTH_OPTIONS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
].map((label, index) => ({ value: index + 1, label }));

const numbers = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });

// ex. "Juin-Sept", "Mai". Pas de saison dans le catalogue (ou de janvier a decembre) : toute l'annee
export function seasonLabel(start: number | null, end: number | null): string {
  if ((!isMonth(start) && !isMonth(end)) || (start === 1 && end === 12)) return "Toute l'année";

  const from = MONTHS[(isMonth(start) ? start : end!) - 1];
  const to = MONTHS[(isMonth(end) ? end : start!) - 1];
  return from === to ? from : `${from}-${to}`;
}

// "kg", "unité" (au pluriel a partir de 2)
export const unitText = (code: string, quantity = 1): string => {
  const label = unitLabel({ quantity: null, unit: code });
  return label === 'unité' && quantity > 1 ? 'unités' : label;
};

// ex. "Tomates · Cœur de bœuf"
export const productTitle = (product: ProducerProduct): string =>
  product.variety ? `${product.name} · ${product.variety}` : product.name;

// ce que le producteur a choisi pour son produit (periode, volume, unite) l'emporte sur ce que dit le catalogue
const period = (product: ProducerProduct): string =>
  product.availability && product.availability.startMonth !== null
    ? seasonLabel(product.availability.startMonth, product.availability.endMonth)
    : seasonLabel(product.seasonStartMonth, product.seasonEndMonth);
const volumeOf = (product: ProducerProduct): string | null => product.availability?.quantity ?? product.estimatedVolume;
const unitOf = (product: ProducerProduct) => product.availability?.unit ?? product.unit;

// ex. "90 kg", sans unite "volume 90"
function volumeLabel(product: ProducerProduct): string | null {
  const raw = volumeOf(product);
  if (raw === null) return null;
  const volume = Number(raw);
  const unit = unitOf(product);
  return unit ? `${numbers.format(volume)} ${unitText(unit.code, volume)}` : `volume ${numbers.format(volume)}`;
}

// ex. "3,50 €/kg"
function priceLabel(product: ProducerProduct): string | null {
  if (product.defaultPrice === null) return null;
  const money = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: product.currencyCode ?? 'EUR',
    minimumFractionDigits: 2,
  }).format(Number(product.defaultPrice));
  const unit = unitOf(product);
  return unit ? `${money}/${unitText(unit.code)}` : money;
}

// ex. "Juin-Sept · 90 kg · 3,50 €/kg" : ce qui n'est pas renseigne n'apparait pas
export const productDetails = (product: ProducerProduct): string =>
  [period(product), volumeLabel(product), priceLabel(product)].filter((part) => !!part).join(' · ');
