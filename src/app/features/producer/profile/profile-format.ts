import { ProfileLabel, ProfileZone } from './profile.service';

// "Ferme Dupont" -> "FD" : l'initiale des deux premiers mots
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

// les labels a afficher en badge --> validés par l'admin et pas expires (un label seulement revendiqué n'est pas un badge)
export function shownLabels(labels: ProfileLabel[], now: Date = new Date()): string[] {
  return labels
    .filter((label) => label.verifiedAt !== null && (label.expiresAt === null || new Date(label.expiresAt) > now))
    .map((label) => label.name);
}

// le plus grand rayon des zones, c'est la "zone de vente" (comme sur la fiche publique) --< null sans zone
export function largestRadius(zones: ProfileZone[]): number | null {
  const radii = zones.map((zone) => Number(zone.radiusKm)).filter((radius) => Number.isFinite(radius) && radius > 0);

  return radii.length > 0 ? Math.max(...radii) : null;
}

// retrait et livraison --> null = pas encore configuré, on laisse la ligne vide plutot que d'ecrire "non proposé"
// (le producteur voit ce qu'il lui reste a remplir) 
export function availability(available: boolean | null, yes: string, no: string): string | null {
  if (available === null) return null;

  return available ? yes : no;
}

// ce que le producteur lit a cote d'un label qu'il a coche --> rien s'il ne l'a pas revendique
export function labelStatus(claimed: ProfileLabel | undefined, now: Date = new Date()): string | null {
  if (!claimed) return null;
  if (claimed.verifiedAt === null) return 'En attente de validation';

  return claimed.expiresAt !== null && new Date(claimed.expiresAt) <= now ? 'Expiré' : 'Validé';
}

// "12,5" ou "12.5" --> nombre, null si vide, NaN si ce n'est pas un nombre
export function parseKm(text: string): number | null {
  const value = text.trim().replace(',', '.');

  return value === '' ? null : Number(value);
}

// 12.5 --> "12,5" (le champ est en francais)
export function kmText(km: number): string {
  return String(km).replace('.', ',');
}

// " lyon " et "Lyon" sont la meme ville
export function sameCity(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
