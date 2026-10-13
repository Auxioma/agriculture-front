import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export type BillingCycle = 'monthly' | 'yearly';

export interface PlanPrice {
  id: string;
  billingCycle: BillingCycle;
  amount: string | null;
  currencyCode: string | null;
}

// les offres viennent de l'admin (Plans) : le front n'en connait aucune par son nom
export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  prices: PlanPrice[];
}

export interface CurrentSubscription {
  planPriceId: string;
  planCode: string;
  planName: string;
  billingCycle: BillingCycle;
  amount: string | null;
  currencyCode: string | null;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  requestsThisMonth: number;
  // null = illimite
  requestsQuota: number | null;
}

export interface Invoice {
  id: string;
  amount: string | null;
  currencyCode: string | null;
  status: string;
  invoiceUrl: string | null;
  createdAt: string;
}

// carte lue chez Stripe : rien n'est garde chez nous
export interface PaymentCard {
  id: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
}

// immediate = tout de suite (montee d'offre) ; next_renewal = a la prochaine echeance (descente)
export interface PlanChange {
  effect: 'immediate' | 'next_renewal';
  effectiveAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getPlans() {
    return this.http.get<Plan[]>(`${this.apiUrl}/subscription/plans`);
  }

  // 204 (aucun abonnement) : le corps est null
  getCurrent() {
    return this.http.get<CurrentSubscription | null>(`${this.apiUrl}/subscription/current`);
  }

  getInvoices() {
    return this.http.get<Invoice[]>(`${this.apiUrl}/subscription/invoices`);
  }

  // page de paiement Stripe : on y envoie le navigateur
  checkout(planPriceId: string) {
    return this.http.post<{ checkoutUrl: string }>(`${this.apiUrl}/subscription/checkout`, { planPriceId });
  }

  changePlan(planPriceId: string) {
    return this.http.post<PlanChange>(`${this.apiUrl}/subscription/change-plan`, { planPriceId });
  }

  cancel() {
    return this.http.post<void>(`${this.apiUrl}/subscription/cancel`, {});
  }

  getCards() {
    return this.http.get<PaymentCard[]>(`${this.apiUrl}/subscription/payment-methods`);
  }

  // page Stripe pour saisir une nouvelle carte
  addCard() {
    return this.http.post<{ setupUrl: string }>(`${this.apiUrl}/subscription/payment-methods/setup`, {});
  }

  makeCardDefault(cardId: string) {
    return this.http.post<void>(`${this.apiUrl}/subscription/payment-methods/${cardId}/default`, {});
  }

  deleteCard(cardId: string) {
    return this.http.delete<void>(`${this.apiUrl}/subscription/payment-methods/${cardId}`);
  }
}
