export type RequestStatus = 'replied' | 'pending';

export interface DashboardRequest {
  id: number;
  title: string;
  sentAt: string; // date ISO
  status: RequestStatus;
}

export interface DashboardMessage {
  id: number;
  producerName: string;
  initials: string;
  subtitle: string;
  unreadCount: number;
}

export interface DashboardFavorite {
  id: number;
  slug: string | null;
  name: string;
  initials: string;
}

export interface DashboardSummary {
  activeRequests: number;
  receivedReplies: number;
  unreadMessages: number;
  requests: DashboardRequest[];
  messages: DashboardMessage[];
  favorites: DashboardFavorite[];
}
