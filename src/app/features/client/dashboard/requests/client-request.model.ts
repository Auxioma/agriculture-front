export type RequestStatus =
  | 'sent'
  | 'waiting_replies'
  | 'replies_received'
  | 'conversation_open'
  | 'deal_found'
  | 'reported'
  | 'archived'
  | 'expired';

export interface ClientRequestItem {
  id: string;
  title: string;
  status: RequestStatus;
  sentAt: string; // ISO 8601
}
