export type Locale = 'fr' | 'en' | 'es' | 'it' | 'de';
export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF';

export interface NotificationSettings {
  producerReply: boolean;
  newMessage: boolean;
  requestExpiring: boolean;
}

export interface Preferences {
  locale: Locale;
  currency: Currency;
  notificationSettings: NotificationSettings;
}

/** Corps du PATCH : tout est optionnel, on n'envoie que ce qui change. */
export interface PreferencesPatch {
  locale?: Locale;
  currency?: Currency;
  notificationSettings?: Partial<NotificationSettings>;
}

export interface Address {
  id: string;
  label: string;
  address1: string;
  address2: string | null;
  city: string;
  postalCode: string;
  countryCode: string;
  isDefault: boolean;
}

export type AddressPayload = Omit<Address, 'id'>;

export interface Me {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ChoiceOption {
  value: string;
  label: string;
}

export const LOCALE_OPTIONS: ChoiceOption[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'de', label: 'Deutsch' },
];

export const CURRENCY_OPTIONS: ChoiceOption[] = [
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dollar US ($)' },
  { value: 'GBP', label: 'Livre Sterling (£)' },
  { value: 'CHF', label: 'Franc Suisse (CHF)' },
];

export const COUNTRY_OPTIONS: ChoiceOption[] = [
  { value: 'FR', label: 'France' },
  { value: 'BE', label: 'Belgique' },
  { value: 'CH', label: 'Suisse' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'DE', label: 'Allemagne' },
  { value: 'ES', label: 'Espagne' },
  { value: 'IT', label: 'Italie' },
  { value: 'GB', label: 'Royaume-Uni' },
];
