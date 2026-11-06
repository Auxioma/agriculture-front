import { Reply, ReplyStatus, RequestSummary } from './reply.model';

const MONEY = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const UNITS: Record<string, string> = { kg: 'kg', unite: 'unité', piece: 'pièce' };

/** « kg », « unité »... : le code de l'API en mot lisible, tel quel s'il est inconnu. */
export const unitLabel = (code: string | null): string => (code ? (UNITS[code] ?? code) : '');

/** « 12,50 € » ; null quand le producteur n'a pas chiffré sa réponse. */
export function priceLabel(reply: Pick<Reply, 'priceAmount' | 'currency'>): string | null {
  return reply.priceAmount === null ? null : `${MONEY.format(reply.priceAmount)} ${reply.currency ?? '€'}`;
}

/** « 14 novembre » ; accepte un jour seul (AAAA-MM-JJ) comme une date complète. */
export function dayLabel(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

/** « Tomates - 5 kg » */
export function requestLabel(request: Pick<RequestSummary, 'product' | 'quantity' | 'unit'>): string {
  const product = request.product ?? 'Demande';
  return request.quantity === null
    ? product
    : `${product} - ${request.quantity} ${unitLabel(request.unit)}`.trim();
}

export const REPLY_STATUS_UI: Record<ReplyStatus, { label: string; badge: string }> = {
  sent: { label: 'Nouvelle', badge: 'bg-gold-wheat text-white' },
  seen: { label: 'Consultée', badge: 'border border-grey-400 text-grey-700' },
  accepted: { label: 'Acceptée', badge: 'bg-agri text-white' },
  declined: { label: 'Refusée', badge: 'border border-grey-400 text-grey-700' },
  expired: { label: 'Expirée', badge: 'border border-grey-400 text-grey-700' },
  archived: { label: 'Archivée', badge: 'border border-grey-400 text-grey-700' },
};

export const REVIEW_STATUS_LABEL = {
  pending: 'en attente de modération',
  published: 'publié',
  rejected: 'refusé par la modération',
} as const;

/** Les réponses qu'on peut encore accepter ou refuser : pas encore tranchées. */
export const isUndecided = (status: ReplyStatus): boolean => status === 'sent' || status === 'seen';

/** Tant que la demande est active, on peut trancher ; une demande annulée, archivée ou expirée ne reçoit plus de décision. */
export const OPEN_REQUEST = ['sent', 'waiting_replies', 'replies_received', 'conversation_open'];
