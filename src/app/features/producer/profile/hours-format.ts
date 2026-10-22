import { OpeningHour } from '../../catalog/models/producer-detail.model';
import { HourSlot } from './profile.service';

// 1 = lundi ... 7 = dimanche, comme le back et la fiche publique
export const DAYS = [
  { weekday: 1, label: 'Lundi' },
  { weekday: 2, label: 'Mardi' },
  { weekday: 3, label: 'Mercredi' },
  { weekday: 4, label: 'Jeudi' },
  { weekday: 5, label: 'Vendredi' },
  { weekday: 6, label: 'Samedi' },
  { weekday: 7, label: 'Dimanche' },
];

// les creneaux a modifier --> un jour ferme (ligne is_closed, sans heures) n'en a pas, c'est un jour decoche
export function slotsFromApi(hours: OpeningHour[]): HourSlot[] {
  const slots: HourSlot[] = [];
  for (const hour of hours) {
    if (hour.isClosed || hour.weekday === null || hour.weekday < 1 || hour.weekday > 7 || !hour.opensAt || !hour.closesAt) continue;
    slots.push({ weekday: hour.weekday, opensAt: hour.opensAt, closesAt: hour.closesAt });
  }

  return slots.sort((a, b) => a.weekday - b.weekday || a.opensAt.localeCompare(b.opensAt));
}

// le 1er probleme des horaires, avec le jour concerne ; null si tout est bon. "HH:MM" se compare comme du texte.
export function hoursError(slots: HourSlot[]): string | null {
  const dayOf = (slot: HourSlot) => DAYS.find((day) => day.weekday === slot.weekday)?.label ?? '';

  for (const slot of slots) {
    if (!slot.opensAt || !slot.closesAt) return `${dayOf(slot)} : indiquez l'ouverture et la fermeture.`;
    if (slot.opensAt >= slot.closesAt) return `${dayOf(slot)} : l'ouverture doit précéder la fermeture.`;
  }

  // deux creneaux du meme jour qui se chevauchent (se toucher, 12:00 puis 12:00, est permis)
  const sorted = [...slots].sort((a, b) => a.weekday - b.weekday || a.opensAt.localeCompare(b.opensAt));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].weekday === sorted[i - 1].weekday && sorted[i].opensAt < sorted[i - 1].closesAt) {
      return `${dayOf(sorted[i])} : deux créneaux se chevauchent.`;
    }
  }

  return null;
}
