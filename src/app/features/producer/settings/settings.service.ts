import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

// les trois e-mails que le producteur peut couper (back : NotificationPreferences::EMAIL_TYPES)
export type EmailType = 'new_relevant_request' | 'payment_failed' | 'subscription_renewing_soon';

// GET et PUT /api/me/preferences. supportEmail est un reglage de l'admin (parametres de la plateforme), pas du producteur.
export interface Preferences {
  locale: string;
  currency: string;
  emailNotifications: Record<EmailType, boolean>;
  supportEmail: string;
}

// PUT : un champ absent n'est pas touche, chaque rubrique s'enregistre seule
export interface PreferencesChange {
  locale?: string;
  currency?: string;
  emailNotifications?: Partial<Record<EmailType, boolean>>;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getPreferences() {
    return this.http.get<Preferences>(`${this.apiUrl}/me/preferences`);
  }

  updatePreferences(change: PreferencesChange) {
    return this.http.put<Preferences>(`${this.apiUrl}/me/preferences`, change);
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.put<null>(`${this.apiUrl}/me/password`, { currentPassword, newPassword });
  }

  // le fichier JSON de GET /api/me/export, en blob : c'est le navigateur qui l'enregistre
  exportData() {
    return this.http.get(`${this.apiUrl}/me/export`, { responseType: 'blob' });
  }

  // DELETE avec un corps. Un abonnement en cours sans acceptSubscriptionCancellation donne un 409 (voir le back) ; le mot de
  // passe faux, un 422 ; trop d'essais, un 429 ; Stripe injoignable, un 502 sans rien supprimer.
  deleteAccount(password: string, acceptSubscriptionCancellation: boolean) {
    return this.http.delete<null>(`${this.apiUrl}/me`, { body: { password, acceptSubscriptionCancellation } });
  }
}
