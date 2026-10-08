export interface AvailableRequest {
  requestId: string;
  clientName: string;
  product: string | null;
  quantity: number | null;
  unit: string | null;
  budgetMax: number | null;
  currency: string | null;
  city: string | null;
  distanceKm: number | null;
  message: string | null;
  urgent: boolean;
  clientType: 'individual' | 'professional';
  isNew: boolean;
  highVolume: boolean;
}

export interface DashboardSubscription {
  planName: string;
  status: string;
  requestsThisMonth: number;
  requestsQuota: number | null;
}

export interface ProducerDashboard {
  farmName: string;
  availableRequests: number;
  urgentRequests: number;
  unreadMessages: number;
  requests: AvailableRequest[];
  subscription: DashboardSubscription | null;
  profile: { completion: number; missing: string[] };
}
