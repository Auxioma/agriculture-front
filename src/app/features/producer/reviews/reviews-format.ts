import { longDate, shortDate } from '../request-format';

// ex. "4,8" ; une decimale meme pour un 5 pile ("5,0"), comme la moyenne que le back arrondit
export const averageLabel = (average: number): string => average.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// la phrase sous la moyenne ("sur 24 avis")
export const basedOn = (count: number): string => `Basé sur ${count} avis`;

// ex. "10 mai" ; l'annee s'ajoute quand l'avis n'est pas de cette annee ("5 mars 2025")
export const reviewDate = (iso: string, now = new Date()): string => (new Date(iso).getFullYear() === now.getFullYear() ? shortDate(iso) : longDate(iso));
