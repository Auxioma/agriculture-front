// dessins des icones (trace svg, 24x24, trait seul) ; la cloche sert pour tout type que le back ajouterait plus tard
const ICONS = {
  reply: 'M9 17l-5-5 5-5 M20 18v-2a4 4 0 0 0-4-4H4',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2',
  check: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3',
  alert: 'M12 9v4 M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
};

// types ecrits par le back (NotificationService::notify) ; ceux qui ne sont pas ici prennent la cloche
const ICON_OF_TYPE: Record<string, keyof typeof ICONS> = {
  producer_replied: 'reply',
  quote_received: 'reply',
  new_message: 'message',
  support_reply: 'message',
  request_expiring_soon: 'clock',
  subscription_renewing_soon: 'clock',
  request_sent: 'check',
  profile_validated: 'check',
  payment_failed: 'alert',
  profile_rejected: 'alert',
  profile_more_info_needed: 'alert',
  subscription_duplicate_cancelled: 'alert',
};

export const iconOf = (type: string | null): string => ICONS[(type && ICON_OF_TYPE[type]) || 'bell'];

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
