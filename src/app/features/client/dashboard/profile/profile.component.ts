import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from './api-error';
import {
  CURRENCY_OPTIONS,
  Currency,
  LOCALE_OPTIONS,
  Locale,
  Me,
  NotificationSettings,
  Preferences,
  PreferencesPatch,
} from './profile.model';
import { ProfileService } from './profile.service';
import { AddressesSectionComponent } from './sections/addresses-section.component';
import { ChoiceSectionComponent } from './sections/choice-section.component';
import { NotificationsSectionComponent } from './sections/notifications-section.component';
import { PersonalDataSectionComponent } from './sections/personal-data-section.component';
import { SecuritySectionComponent } from './sections/security-section.component';
import { AccordionItemComponent } from './ui/accordion-item.component';
import { PageHeaderComponent } from '../../ui/page-header.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    RouterLink,
    AccordionItemComponent,
    AddressesSectionComponent,
    SecuritySectionComponent,
    NotificationsSectionComponent,
    ChoiceSectionComponent,
    PersonalDataSectionComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly profile = inject(ProfileService);
  private readonly auth = inject(AuthService);

  readonly localeOptions = LOCALE_OPTIONS;
  readonly currencyOptions = CURRENCY_OPTIONS;
  readonly icons = {
    pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
    help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01',
    coin: 'M12 2v20 M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    globe:
      'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20',
  };

  readonly me = signal<Me | null>(null);
  readonly preferences = signal<Preferences | null>(null);
  readonly error = signal<string | null>(null);
  /** Un seul accordéon ouvert à la fois. */
  readonly openSection = signal<string | null>(null);

  readonly displayName = computed(() => {
    const me = this.me();
    return me ? `${me.firstName} ${me.lastName.charAt(0)}.` : '';
  });
  readonly initial = computed(() => this.me()?.firstName.charAt(0).toUpperCase() ?? '');
  readonly localeLabel = computed(
    () => LOCALE_OPTIONS.find((o) => o.value === this.preferences()?.locale)?.label ?? '',
  );
  readonly currencyLabel = computed(
    () => CURRENCY_OPTIONS.find((o) => o.value === this.preferences()?.currency)?.label ?? '',
  );

  ngOnInit(): void {
    this.profile.me().subscribe({
      next: (me) => this.me.set(me),
      error: (err) => this.error.set(apiErrorMessage(err, 'Impossible de charger votre profil.')),
    });
    this.profile.preferences().subscribe({
      next: (prefs) => this.preferences.set(prefs),
      error: (err) =>
        this.error.set(apiErrorMessage(err, 'Impossible de charger vos préférences.')),
    });
  }

  toggle(id: string): void {
    this.openSection.update((current) => (current === id ? null : id));
  }

  setLocale(value: string): void {
    this.savePreferences({ locale: value as Locale });
  }

  setCurrency(value: string): void {
    this.savePreferences({ currency: value as Currency });
  }

  setNotifications(change: Partial<NotificationSettings>): void {
    this.savePreferences({ notificationSettings: change });
  }

  /**
   * Mise à jour optimiste : l'écran change tout de suite, puis on corrige avec la réponse du serveur.
   * Si l'API échoue, on revient à l'état précédent (rollback) et on affiche l'erreur.
   */
  savePreferences(patch: PreferencesPatch): void {
    const previous = this.preferences();
    if (!previous) return;

    this.error.set(null);
    this.preferences.set({
      ...previous,
      ...patch,
      notificationSettings: { ...previous.notificationSettings, ...patch.notificationSettings },
    });

    this.profile.updatePreferences(patch).subscribe({
      next: (saved) => this.preferences.set(saved),
      error: (err) => {
        this.preferences.set(previous);
        this.error.set(apiErrorMessage(err, "Impossible d'enregistrer ce réglage."));
      },
    });
  }

  onAccountDeleted(): void {
    this.auth.logout();
  }
}
