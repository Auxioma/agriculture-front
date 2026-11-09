import { ClientConversation } from './client-messages.model';

// recherche sans tenir compte des accents ni de la casse
const plain = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// la recherche de la liste : le producteur, le produit demande et le dernier message
export function matches(c: ClientConversation, query: string): boolean {
  const wanted = plain(query.trim());
  if (!wanted) return true;
  return [c.producerName, c.product ?? '', c.lastMessage?.preview ?? ''].some((text) =>
    plain(text).includes(wanted),
  );
}

// date a afficher sur la ligne : celle du dernier message, sinon la derniere activite connue
export const conversationTime = (c: ClientConversation): string | null =>
  c.lastMessage?.createdAt ?? c.lastMessageAt;

// ex. "Pommes - 5 kg"
export function conversationTitle(c: Pick<ClientConversation, 'product' | 'quantity' | 'unit'>): string {
  const product = c.product ?? 'Demande';
  return c.quantity === null ? product : `${product} - ${c.quantity} ${c.unit ?? ''}`.trim();
}

// ce que le client peut signaler dans une conversation ; le back accepte n'importe quel motif non vide
export const CLIENT_REPORT_REASONS = [
  { code: 'inappropriate', label: 'Propos inappropriés ou injurieux' },
  {
    code: 'circumvention',
    label: 'Coordonnées suspectes ou tentative de contournement de la plateforme',
  },
  { code: 'fraud', label: 'Fraude ou arnaque' },
  { code: 'other', label: 'Autre' },
];
