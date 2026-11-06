import { RequestStatus } from '../client-request.model';

/** Statut d'une réponse de producteur (cahier : statuts d'une réponse). « sent » = pas encore consultée. */
export type ReplyStatus = 'sent' | 'seen' | 'accepted' | 'declined' | 'expired' | 'archived';

export interface ReplyProducer {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  verified: boolean;
  /** À vol d'oiseau, au dixième de kilomètre ; null si l'un des deux n'a pas de position. */
  distanceKm: number | null;
}

export interface ReplyAttachment {
  id: string;
  fileName: string | null;
  mimeType: string | null;
  /** URL signée, qui expire : générée par le back à chaque lecture. */
  fileUrl: string | null;
}

export interface ReplyReview {
  rating: number;
  status: 'pending' | 'published' | 'rejected';
}

/** Une réponse ou un devis, tel que GET /api/client/requests/{id}/replies le donne. */
export interface Reply {
  id: string;
  status: ReplyStatus;
  sentAt: string;
  producer: ReplyProducer;
  message: string | null;
  priceAmount: number | null;
  priceUnit: string | null;
  currency: string | null;
  availableQuantity: number | null;
  quantityUnit: string | null;
  /** Jour seul (AAAA-MM-JJ). */
  availabilityDate: string | null;
  validUntil: string | null;
  conditions: string | null;
  pickupConditions: string | null;
  deliveryConditions: string | null;
  conversationId: string | null;
  review: ReplyReview | null;
  attachments: ReplyAttachment[];
}

export interface RequestSummary {
  id: string;
  status: RequestStatus;
  product: string | null;
  quantity: number | null;
  unit: string | null;
  city: string | null;
  desiredDate: string | null;
  sentAt: string;
}

export interface RequestReplies {
  request: RequestSummary;
  replies: Reply[];
}

export interface NewReview {
  requestId: string;
  producerId: string;
  rating: number;
  comment: string | null;
}
