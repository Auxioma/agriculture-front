import { LastMessage, ProducerConversation } from './messages.model';

// les 7 reponses rapides du cahier fonctionnel ; la maquette n'en montre que trois, avec des libelles courts.
// Elles se glissent dans le champ de saisie (on peut les modifier avant d'envoyer), la 3e est a completer.
export const QUICK_REPLIES = [
  { label: 'Disponible', text: 'Bonjour, ce produit est disponible.' },
  { label: 'Quantité souhaitée', text: 'Pouvez-vous préciser la quantité souhaitée ?' },
  { label: 'À partir de…', text: 'Je peux vous proposer ce produit à partir de ' },
  { label: 'Retrait ferme', text: 'Le retrait est possible à la ferme.' },
  { label: 'Livraison', text: 'La livraison est possible dans votre zone.' },
  { label: 'Je vous joins un devis', text: 'Je vous joins un devis.' },
  { label: 'Autre disponibilité', text: 'Je ne suis pas disponible à cette date, mais je peux vous proposer une alternative.' },
];

// memes formats et meme plafond que le back (ConversationController)
export const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const ATTACHMENT_MAX_MB = 10;

export const CLIENT_TYPES = { individual: 'Client particulier', professional: 'Client professionnel' };

// ce que le producteur peut signaler dans une conversation ; le back accepte n'importe quel motif non vide
export const REPORT_REASONS = [
  { code: 'inappropriate', label: 'Propos inappropriés ou injurieux' },
  { code: 'circumvention', label: 'Coordonnées suspectes ou tentative de contournement de la plateforme' },
  { code: 'fraud', label: 'Fraude ou demande fictive' },
  { code: 'other', label: 'Autre' },
];

// ex. "CR" pour "Camille R.", "C" pour "Client"
export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter((word) => !!word)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

const dayStart = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

// nombre de jours entiers entre la date et maintenant (0 = aujourd'hui, 1 = hier)
const daysAgo = (iso: string, now: Date): number => Math.round((dayStart(now) - dayStart(new Date(iso))) / 86_400_000);

const upperFirst = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

// ex. "09:16"
export const clockTime = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

// heure du dernier message dans la liste : "09:16", "Hier", "Lun." puis "12 oct." au-dela de la semaine
export function listTime(iso: string, now = new Date()): string {
  const days = daysAgo(iso, now);
  if (days <= 0) return clockTime(iso);
  if (days === 1) return 'Hier';
  if (days < 7) return upperFirst(new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(new Date(iso)));
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

// separateur de jour dans le fil : "Aujourd'hui", "Hier", "lundi 12 octobre" (l'annee s'ajoute si ce n'est pas la meme)
export function dayLabel(iso: string, now = new Date()): string {
  const days = daysAgo(iso, now);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  const date = new Date(iso);
  const withYear = date.getFullYear() !== now.getFullYear();
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: withYear ? 'numeric' : undefined }).format(date);
}

// ligne d'apercu de la liste ; "Vous : " quand c'est le producteur qui a ecrit en dernier
export function previewText(last: LastMessage | null): string {
  if (!last) return 'Pas encore de message';
  const body = last.moderated ? 'Message masqué' : (last.preview ?? (last.hasAttachment ? 'Pièce jointe' : ''));
  return last.fromMe ? `Vous : ${body}` : body;
}

// date a afficher sur la ligne : celle du dernier message, sinon la derniere activite connue
export const conversationTime = (c: ProducerConversation): string | null => c.lastMessage?.createdAt ?? c.lastMessageAt;

// recherche sans tenir compte des accents ni de la casse
const plain = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function matches(c: ProducerConversation, query: string): boolean {
  const wanted = plain(query.trim());
  if (!wanted) return true;
  return [c.clientName, c.product ?? '', c.lastMessage?.preview ?? ''].some((text) => plain(text).includes(wanted));
}

// null si le fichier peut partir, sinon la raison du refus
export function fileProblem(file: File): string | null {
  if (!ATTACHMENT_TYPES.includes(file.type)) return 'Format non supporté (jpeg, png, webp ou pdf uniquement).';
  if (file.size > ATTACHMENT_MAX_MB * 1024 * 1024) return `Fichier trop volumineux (${ATTACHMENT_MAX_MB} Mo maximum).`;
  return null;
}
