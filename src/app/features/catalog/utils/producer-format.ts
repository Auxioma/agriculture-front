import { unitText } from '../../producer/products/product-format';
import { OpeningHour, ProducerProductSummary } from '../models/producer-detail.model';

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_LABELS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
/** Segment d'URL public d'un producteur : son slug, ou son id tant que le slug est NULL (ou vide) en base */
export function producerRef(producer: { id: string; slug: string | null }): string {
  return producer.slug || producer.id;
}

export function producerPath(producer: { id: string; slug: string | null }): string[] {
  return ['/producers', producerRef(producer)];
}

// * « de » devient « d' » devant une voyelle : avril, août, octobre.
const VOWEL_MONTHS = new Set([4, 8, 10]);

function isMonth(value: number | null): value is number {
  return value !== null && Number.isInteger(value) && value >= 1 && value <= 12;
}

/**
 * « Disponible toute l'année », « Disponible de juin à septembre », « Disponible en mai »…
 * null si la période est inconnue (mois manquants ou invalides).
 */
export function availabilityLabel(
  startMonth: number | null,
  endMonth: number | null,
): string | null {
  if (!isMonth(startMonth) || !isMonth(endMonth)) return null;

  // * Début = mois qui suit la fin (1→12, 3→2…) : la période couvre les 12 mois.
  if (startMonth === (endMonth % 12) + 1) return "Disponible toute l'année";
  if (startMonth === endMonth) return `Disponible en ${MONTH_LABELS[startMonth - 1]}`;

  const from = VOWEL_MONTHS.has(startMonth)
    ? `d'${MONTH_LABELS[startMonth - 1]}`
    : `de ${MONTH_LABELS[startMonth - 1]}`;

  return `Disponible ${from} à ${MONTH_LABELS[endMonth - 1]}`;
}

const quantities = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });

/** « 50 kg », « 30 unités » ; sans unité « volume 50 » ; null sans volume */
export function productQuantity(product: Pick<ProducerProductSummary, 'quantity' | 'unit'>): string | null {
  const quantity = Number(product.quantity ?? NaN);
  if (!Number.isFinite(quantity)) return null;

  return product.unit
    ? `${quantities.format(quantity)} ${unitText(product.unit.code, quantity)}`
    : `volume ${quantities.format(quantity)}`;
}

/** « 3,50 €/kg » ; sans unité « 3,50 € » ; null sans prix. La devise est l'euro quand elle n'est pas donnée. */
export function productPrice(
  product: Pick<ProducerProductSummary, 'price' | 'currencyCode' | 'unit'>,
): string | null {
  const price = Number(product.price ?? NaN);
  if (!Number.isFinite(price)) return null;

  const money = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: product.currencyCode ?? 'EUR',
    minimumFractionDigits: 2,
  }).format(price);

  return product.unit ? `${money}/${unitText(product.unit.code)}` : money;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');

  return minutes === '00' ? `${Number(hours)}h` : `${Number(hours)}h${minutes}`;
}

/**
 * Résume les horaires : « Lun-Sam 9h-18h » ou « Lun-Ven 9h-18h · Sam 9h-12h30 ».
 * Les jours consécutifs qui ont les mêmes créneaux sont regroupés ; les jours fermés sont ignorés.
 * null s'il n'y a aucun créneau d'ouverture.
 */
export function summarizeOpeningHours(hours: OpeningHour[]): string | null {
  const slotsByDay = new Map<number, string[]>();
  for (const hour of hours) {
    if (
      hour.isClosed ||
      hour.weekday === null ||
      hour.weekday < 1 ||
      hour.weekday > 7 ||
      !hour.opensAt ||
      !hour.closesAt
    ) {
      continue;
    }
    const slots = slotsByDay.get(hour.weekday) ?? [];
    slots.push(`${formatTime(hour.opensAt)}-${formatTime(hour.closesAt)}`);
    slotsByDay.set(hour.weekday, slots);
  }
  if (slotsByDay.size === 0) return null;

  const groups: { first: number; last: number; slots: string }[] = [];
  for (const day of [...slotsByDay.keys()].sort((a, b) => a - b)) {
    const slots = [...(slotsByDay.get(day) ?? [])].sort().join(' / ');
    const previous = groups[groups.length - 1];
    if (previous && previous.last === day - 1 && previous.slots === slots) {
      previous.last = day;
    } else {
      groups.push({ first: day, last: day, slots });
    }
  }

  return groups
    .map((group) => {
      const days =
        group.first === group.last
          ? DAY_LABELS[group.first - 1]
          : `${DAY_LABELS[group.first - 1]}-${DAY_LABELS[group.last - 1]}`;

      return `${days} ${group.slots}`;
    })
    .join(' · ');
}

/** « Rayon de 20 km », « Rayon de 12,5 km » */
export function formatRadius(km: number): string {
  return `Rayon de ${String(km).replace('.', ',')} km`;
}

/** « 10 août », avec l'année si elle diffère de l'année en cours : « 3 mars 2025 » */
export function formatReviewDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { day: 'numeric', month: 'long' }
      : { day: 'numeric', month: 'long', year: 'numeric' };

  return new Intl.DateTimeFormat('fr-FR', options).format(date);
}

/** Couleur du badge selon le code du label ; couleur neutre pour un label inconnu */
export function labelBadgeClass(code: string): string {
  switch (code) {
    case 'bio':
      return 'bg-agri text-white';
    case 'local':
      return 'bg-earth text-white';
    default:
      return 'bg-badge-bg text-agri';
  }
}
