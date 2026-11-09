import { hasClientRole } from '../../features/client/client-role';
import { hasProducerRole } from '../../features/producer/producer-role';

// dessins des icones (trace svg, 24x24, trait seul) ; la cloche sert pour tout type que le back ajouterait plus tard
const ICONS = {
  reply: 'M9 17l-5-5 5-5 M20 18v-2a4 4 0 0 0-4-4H4',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2',
  check: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3',
  alert: 'M12 9v4 M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
  heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
};

// types ecrits par le back (NotificationService::notify) ; ceux qui ne sont pas ici prennent la cloche
const ICON_OF_TYPE: Record<string, keyof typeof ICONS> = {
  producer_replied: 'reply',
  quote_received: 'reply',
  client_replied: 'reply',
  new_message: 'message',
  support_reply: 'message',
  request_expiring_soon: 'clock',
  subscription_renewing_soon: 'clock',
  favorite_producer_available: 'heart',
  review_reminder: 'star',
  request_sent: 'check',
  profile_validated: 'check',
  payment_failed: 'alert',
  profile_rejected: 'alert',
  profile_more_info_needed: 'alert',
  subscription_duplicate_cancelled: 'alert',
};

export const iconOf = (type: string | null): string => ICONS[(type && ICON_OF_TYPE[type]) || 'bell'];

// la page de l'espace producteur ou mene une notification, d'apres son type : le back ne donne pas d'identifiant (pas de requestId...),
// on va donc a la section et non a l'element. Les types du client (devis recu, producteur ayant repondu...) ne menent nulle part ici :
// c'est au cote client de dire ou ils vont
const PRODUCER_DESTINATION: Record<string, string> = {
  new_relevant_request: '/producer/requests',
  request_expiring_soon: '/producer/requests',
  new_message: '/producer/messages',
  new_review: '/producer/profile/reviews',
  payment_failed: '/producer/subscription',
  subscription_renewing_soon: '/producer/subscription',
  subscription_duplicate_cancelled: '/producer/subscription',
  profile_validated: '/producer/profile',
  profile_rejected: '/producer/profile',
  profile_more_info_needed: '/producer/profile',
  support_reply: '/producer/support',
  client_replied: '/producer/requests/quotes',
};

export const producerDestination = (type: string | null): string | null => (type && PRODUCER_DESTINATION[type]) || null;

// idem pour le client : la section de son espace, et l'element precis quand le back a donne son identifiant (requestId pour une reponse,
// un devis, un avis a laisser ou une demande qui expire ; conversationId pour un message). "Demande envoyee" ne mene qu'a la liste de ses
// demandes. L'avis se laisse sur la page de la demande (formulaire d'avis).
const CLIENT_DESTINATION: Record<string, string> = {
  request_sent: '/client/requests',
  request_expiring_soon: '/client/requests',
  producer_replied: '/client/requests',
  quote_received: '/client/requests',
  review_reminder: '/client/requests',
  new_message: '/client/messages',
};

const idIn = (data: unknown, key: string): string | null => {
  const value = data && !Array.isArray(data) ? (data as Record<string, unknown>)[key] : null;
  return typeof value === 'string' && value ? value : null;
};

export function clientDestination(type: string | null, data: unknown): string | null {
  // un producteur favori qui propose du nouveau : sa fiche (le back donne son adresse, producerSlug) ; sans, la liste des producteurs
  if (type === 'favorite_producer_available') {
    const slug = idIn(data, 'producerSlug');
    return slug ? `/producers/${slug}` : '/producers';
  }

  const section = type ? CLIENT_DESTINATION[type] : undefined;
  if (!section) return null;

  const id = idIn(data, type === 'new_message' ? 'conversationId' : 'requestId');
  return id && type !== 'request_sent' ? `${section}/${id}` : section;
}

// ou mene une notification, selon le role de celui qui la lit
export function destinationFor(roles: readonly string[] | null | undefined, type: string | null, data: unknown): string | null {
  if (!roles) return null;
  if (hasProducerRole([...roles])) return producerDestination(type);
  if (hasClientRole([...roles])) return clientDestination(type, data);
  return null;
}

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// "Il y a 10 min", "Il y a 3 h", "Hier", "Il y a 4 j", puis la date. Hier et aujourd'hui se comptent en jours du calendrier,
// pas en tranches de 24 h : une notification de 23 h hier est "Hier" des minuit.
export function timeAgo(iso: string, nowMs: number): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';

  const minutes = Math.floor((nowMs - then.getTime()) / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;

  const now = new Date(nowMs);
  // * round : un changement d'heure donne des jours de 23 h ou 25 h
  const days = Math.round((startOfDay(now) - startOfDay(then)) / DAY);
  if (days === 0) return `Il y a ${Math.floor(minutes / 60)} h`;
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} j`;

  return then.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: then.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}
