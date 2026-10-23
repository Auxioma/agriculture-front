import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { messageOf } from '../message-of';
import { PasswordSectionComponent } from './password-section.component';
import { PersonalDataSectionComponent } from './personal-data-section.component';
import { EmailType, Preferences, PreferencesChange, SettingsService } from './settings.service';

// tracés svg des icones (trait de 2), une ligne = un ou plusieurs <path>
const BELL = ['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'];
const LOCK = ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'];
const SHIELD = ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'];
const HELP = ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3', 'M12 17h.01'];
const GLOBE = ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20'];
const EURO = ['M18 7a6 6 0 1 0 0 10', 'M4 10h9', 'M4 14h9'];

export type SectionId = 'notifications' | 'security' | 'data' | 'help' | 'language' | 'currency';

const SECTIONS: { id: SectionId; title: string; hint: string; icon: string[] }[] = [
  { id: 'notifications', title: 'Notifications', hint: 'Demandes, paiements, abonnement', icon: BELL },
  { id: 'security', title: 'Sécurité', hint: 'Mot de passe, connexion', icon: LOCK },
  { id: 'data', title: 'Données personnelles', hint: 'Export et suppression RGPD', icon: SHIELD },
  { id: 'help', title: 'Aide et support', hint: 'FAQ, contact', icon: HELP },
  { id: 'language', title: 'Langue', hint: '', icon: GLOBE },
  { id: 'currency', title: 'Devise', hint: '', icon: EURO },
];

// les trois e-mails que le figma laisse couper ; les autres notifications du cahier partent toujours
const NOTIFICATIONS: { type: EmailType; label: string }[] = [
  { type: 'new_relevant_request', label: 'Nouvelle demande pertinente' },
  { type: 'payment_failed', label: 'Paiement échoué' },
  { type: 'subscription_renewing_soon', label: 'Abonnement bientôt renouvelé' },
];

// langues et devises du cahier fonctionnel (internationalisation)
const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'de', label: 'Deutsch' },
];
const CURRENCIES = [
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'USD', label: 'Dollar US ($)' },
  { code: 'GBP', label: 'Livre Sterling (£)' },
  { code: 'CHF', label: 'Franc Suisse (CHF)' },
];

//! page Parametres semblable au figma : six rubriques qui s'ouvrent vers le bas (plusieurs peuvent l'etre en meme temps), toutes
// fermees au depart. Notifications, langue et devise s'enregistrent des qu'on les change (GET et PUT /api/me/preferences) ;
// la securite et les donnees personnelles ont leur propre composant.
//  - Un interrupteur de notification coupe l'e-mail, pas la notification dans l'application (c'est dit sous la liste).
//  - Langue et devise sont enregistrees mais ne changent rien pour l'instant : le front n'est pas traduit et les offres sont en euros.
//    Une phrase le dit des qu'on choisit autre chose que le francais ou l'euro.
@Component({
  selector: 'app-producer-settings',
  standalone: true,
  imports: [RouterLink, PasswordSectionComponent, PersonalDataSectionComponent],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  private service = inject(SettingsService);

  readonly sections = SECTIONS;
  readonly notifications = NOTIFICATIONS;
  readonly languages = LANGUAGES;
  readonly currencies = CURRENCIES;

  open = signal<ReadonlySet<SectionId>>(new Set());
  // undefined = chargement, null = erreur (back injoignable)
  preferences = signal<Preferences | null | undefined>(undefined);
  notice = signal('');
  error = signal('');

  constructor() {
    this.service
      .getPreferences()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (preferences) => this.preferences.set(preferences),
        error: () => this.preferences.set(null),
      });
  }

  isOpen(id: SectionId): boolean {
    return this.open().has(id);
  }

  toggleSection(id: SectionId): void {
    this.open.update((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  // ce que la rubrique affiche sous son titre : pour la langue et la devise, le choix en cours
  hint(section: { id: SectionId; hint: string }): string {
    const preferences = this.preferences();
    if (section.id === 'language') return LANGUAGES.find((l) => l.code === preferences?.locale)?.label ?? '';
    if (section.id === 'currency') return CURRENCIES.find((c) => c.code === preferences?.currency)?.label ?? '';

    return section.hint;
  }

  toggleEmail(type: EmailType): void {
    const preferences = this.preferences();
    if (!preferences) return;
    const value = !preferences.emailNotifications[type];
    this.save({ emailNotifications: { [type]: value } }, { ...preferences, emailNotifications: { ...preferences.emailNotifications, [type]: value } });
  }

  chooseLanguage(code: string): void {
    const preferences = this.preferences();
    if (preferences) this.save({ locale: code }, { ...preferences, locale: code });
  }

  chooseCurrency(code: string): void {
    const preferences = this.preferences();
    if (preferences) this.save({ currency: code }, { ...preferences, currency: code });
  }

  languageNote(): string {
    const locale = this.preferences()?.locale;
    if (!locale || locale === 'fr') return '';

    return `L'interface n'est pas encore traduite en ${LANGUAGES.find((l) => l.code === locale)?.label} : votre choix est enregistré pour la suite.`;
  }

  currencyNote(): string {
    const currency = this.preferences()?.currency;

    return !currency || currency === 'EUR' ? '' : "Les offres et les factures de l'abonnement restent en euros.";
  }

  // le choix s'affiche tout de suite, puis le back confirme ; s'il refuse, on revient a l'etat d'avant
  private save(change: PreferencesChange, optimistic: Preferences): void {
    const before = this.preferences();
    this.preferences.set(optimistic);
    this.notice.set('');
    this.error.set('');
    this.service.updatePreferences(change).subscribe({
      next: (saved) => {
        this.preferences.set(saved);
        this.notice.set('Préférences enregistrées.');
      },
      error: (err: HttpErrorResponse) => {
        this.preferences.set(before);
        this.error.set(messageOf(err));
      },
    });
  }
}
