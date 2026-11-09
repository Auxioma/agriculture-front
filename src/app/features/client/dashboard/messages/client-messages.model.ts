import { LastMessage } from '../../../producer/messages/messages.model';

// une ligne de GET /api/client/conversations. open = en cours, reported = signalee et pas encore tranchee.
// Le fil lui-meme (messages, pieces jointes) est le meme que pour le producteur : voir producer/messages/messages.model.ts
export interface ClientConversation {
  id: string;
  requestId: string;
  producerId: string;
  producerName: string;
  producerSlug: string;
  product: string | null;
  quantity: number | null;
  unit: string | null;
  status: 'open' | 'archived' | 'reported' | 'closed';
  lastMessageAt: string | null;
  unreadCount: number;
  lastMessage: LastMessage | null;
}
