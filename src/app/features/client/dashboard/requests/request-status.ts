import { RequestStatus } from './client-request.model';

export type Filter = 'all' | 'pending' | 'replied' | 'archived';

export interface StatusUi {
  label: string;
  filter: Filter;
  badge: string;
}

/** Libellé, onglet de la liste et couleur du badge de chaque statut de demande (cahier : statuts de demande). */
export const STATUS_UI: Record<RequestStatus, StatusUi> = {
  sent: { label: 'En attente', filter: 'pending', badge: 'bg-gold-wheat text-white' },
  waiting_replies: { label: 'En attente', filter: 'pending', badge: 'bg-gold-wheat text-white' },
  replies_received: { label: 'Réponses reçues', filter: 'replied', badge: 'bg-agri text-white' },
  conversation_open: {
    label: 'Conversation ouverte',
    filter: 'replied',
    badge: 'bg-agri text-white',
  },
  deal_found: { label: 'Accord trouvé', filter: 'replied', badge: 'bg-agri text-white' },
  reported: { label: 'Signalée', filter: 'pending', badge: 'border border-grey-400 text-grey-700' },
  archived: {
    label: 'Archivée',
    filter: 'archived',
    badge: 'border border-grey-400 text-grey-700',
  },
  expired: { label: 'Expirée', filter: 'archived', badge: 'border border-grey-400 text-grey-700' },
};
