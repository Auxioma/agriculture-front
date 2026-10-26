/** « Ferme des Lilas » → « FL » (ignore les mots courts : de, des, &) */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter((word) => word.length > 2)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}
