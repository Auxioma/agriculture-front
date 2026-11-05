export type RequestStatus = 'replied' | 'pending';

export interface DashboardRequest {
  id: string;
  title: string;
  sentAt: string; // date ISO
  status: RequestStatus;
}

export interface DashboardMessage {
  id: string;
  producerName: string;
  initials: string;
  subtitle: string;
  unreadCount: number;
}

export interface DashboardFavorite {
  id: string;
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
