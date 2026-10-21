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
