import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { SettingsComponent } from './settings.component';
import { Preferences, SettingsService } from './settings.service';

const PREFERENCES: Preferences = {
  locale: 'fr',
  currency: 'EUR',
  notifications: {
    new_relevant_request: true,
    request_expiring_soon: true,
    new_message: false,
    payment_failed: true,
    subscription_renewing_soon: false,
    profile_validated: true,
    new_review: false,
  },
  supportEmail: 'support@trouvemoi.com',
};

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let compiled: HTMLElement;
  let service: { getPreferences: ReturnType<typeof vi.fn>; updatePreferences: ReturnType<typeof vi.fn> };

  async function create(preferences$: Observable<Preferences> = of(PREFERENCES)): Promise<void> {
    service = {
      getPreferences: vi.fn(() => preferences$),
      updatePreferences: vi.fn((change) =>
        of({ ...PREFERENCES, ...change, notifications: { ...PREFERENCES.notifications, ...change.notifications } }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideRouter([]),
        { provide: SettingsService, useValue: service },
        { provide: SubscriptionService, useValue: { getCurrent: vi.fn(() => of(null)) } },
        { provide: AuthService, useValue: { logout: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const header = (title: string) => [...compiled.querySelectorAll<HTMLButtonElement>('h2 button')].find((b) => b.textContent?.includes(title))!;
  const open = (title: string) => {
    header(title).click();
    fixture.detectChanges();
  };
  const panel = (id: string) => compiled.querySelector(`#panel-${id}`);
  const switches = () => [...compiled.querySelectorAll<HTMLButtonElement>('button[role=switch]')];
  const radios = (name: string) => [...compiled.querySelectorAll<HTMLInputElement>(`input[type=radio][name=${name}]`)];
  const text = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const heading = (button: Element) => [...button.querySelectorAll('span.block')].map((span) => text(span)).join(' ');

  it('liste les six rubriques fermées, la langue et la devise disant leur choix en cours', async () => {
    await create();

    expect([...compiled.querySelectorAll('h2 button')].map((b) => heading(b))).toEqual([
      'Notifications Demandes, paiements, abonnement',
      'Sécurité Mot de passe, connexion',
      'Données personnelles Export et suppression RGPD',
      'Aide et support FAQ, contact',
      'Langue Français',
      'Devise Euro (€)',
    ]);
    expect(compiled.querySelectorAll('[id^=panel-]').length).toBe(0);
    expect(header('Langue').getAttribute('aria-expanded')).toBe('false');
  });

  it('ouvre et ferme chaque rubrique sans toucher aux autres', async () => {
    await create();

    open('Notifications');
    open('Langue');
    expect(header('Notifications').getAttribute('aria-expanded')).toBe('true');
    expect(header('Notifications').getAttribute('aria-controls')).toBe('panel-notifications');
    expect(panel('notifications')).not.toBeNull();
    expect(panel('language')).not.toBeNull();

    open('Notifications');
    expect(panel('notifications')).toBeNull();
    expect(panel('language')).not.toBeNull();
  });

  it('montre l état de chaque notification en interrupteurs', async () => {
    await create();

    open('Notifications');

    expect([...compiled.querySelectorAll('#panel-notifications li')].map((li) => text(li))).toEqual([
      'Nouvelle demande pertinente',
      'Demande expirant bientôt',
      'Nouveau message',
      'Paiement échoué',
      'Abonnement bientôt renouvelé',
      'Profil validé',
      'Nouvel avis client',
    ]);
    expect(switches().map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'true', 'false', 'true', 'false', 'true', 'false']);
    expect(compiled.textContent).toContain("Une notification désactivée ne vous est plus envoyée, ni par e-mail ni dans l'application.");
  });

  it('enregistre un interrupteur dès qu on le change, avec le seul champ modifié', async () => {
    await create();
    open('Notifications');

    switches()[3].click();
    fixture.detectChanges();

    expect(service.updatePreferences).toHaveBeenCalledWith({ notifications: { payment_failed: false } });
    expect(switches().map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'true', 'false', 'false', 'false', 'true', 'false']);
    expect(compiled.querySelector('[role=status]')?.textContent).toContain('Préférences enregistrées.');
  });

  it('chaque interrupteur enregistre sa propre notification, à l inverse de son état', async () => {
    await create();
    open('Notifications');
    const types = ['new_relevant_request', 'request_expiring_soon', 'new_message', 'payment_failed', 'subscription_renewing_soon', 'profile_validated', 'new_review'];

    types.forEach((type, i) => {
      const before = PREFERENCES.notifications[type as keyof Preferences['notifications']];
      switches()[i].click();
      fixture.detectChanges();

      expect(service.updatePreferences).toHaveBeenLastCalledWith({ notifications: { [type]: !before } });
    });
    expect(service.updatePreferences).toHaveBeenCalledTimes(7);
  });

  it('remet l interrupteur comme avant et dit pourquoi quand l enregistrement échoue', async () => {
    await create();
    service.updatePreferences.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 422, error: { error: 'Notification inconnue.' } })));
    open('Notifications');

    switches()[4].click();
    fixture.detectChanges();

    expect(switches().map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'true', 'false', 'true', 'false', 'true', 'false']);
    expect(compiled.querySelector('[role=alert]')?.textContent).toContain('Notification inconnue.');
    expect(compiled.querySelector('[role=status]')).toBeNull();
  });

  it('enregistre la langue choisie, la dit sous le titre et prévient que l interface n est pas traduite', async () => {
    await create();
    open('Langue');
    expect(radios('language').map((r) => r.checked)).toEqual([true, false, false, false, false]);
    expect(compiled.querySelector('#panel-language')?.textContent).not.toContain("pas encore traduite");

    radios('language')[1].click();
    fixture.detectChanges();

    expect(service.updatePreferences).toHaveBeenCalledWith({ locale: 'en' });
    expect(heading(header('Langue'))).toBe('Langue English');
    expect(compiled.querySelector('#panel-language')?.textContent).toContain("L'interface n'est pas encore traduite en English");

    radios('language')[0].click();
    fixture.detectChanges();
    expect(compiled.querySelector('#panel-language')?.textContent).not.toContain('pas encore traduite');
  });

  it('enregistre la devise choisie et rappelle que les offres restent en euros', async () => {
    await create();
    open('Devise');
    expect(radios('currency').map((r) => r.checked)).toEqual([true, false, false, false]);
    // * avec l'euro, rien à rappeler
    expect(compiled.querySelector('#panel-currency')?.textContent).not.toContain('restent en euros');

    radios('currency')[3].click();
    fixture.detectChanges();

    expect(service.updatePreferences).toHaveBeenCalledWith({ currency: 'CHF' });
    expect(heading(header('Devise'))).toBe('Devise Franc Suisse (CHF)');
    expect(compiled.querySelector('#panel-currency')?.textContent).toContain("restent en euros");

    radios('currency')[0].click();
    fixture.detectChanges();
    expect(compiled.querySelector('#panel-currency')?.textContent).not.toContain('restent en euros');
  });

  it('donne la FAQ, le support et l adresse du support réglée par l admin', async () => {
    await create();

    open('Aide et support');

    const links = [...compiled.querySelectorAll('#panel-help a')].map((a) => [text(a), a.getAttribute('href')]);
    expect(links).toEqual([
      ['Consulter la FAQ', '/faq'],
      ['Contacter le support', '/producer/support'],
      ['support@trouvemoi.com', 'mailto:support@trouvemoi.com'],
    ]);
  });

  it('garde les liens d aide quand les préférences ne se chargent pas, et le dit pour les autres rubriques', async () => {
    await create(throwError(() => new Error('API injoignable')));

    open('Aide et support');
    open('Langue');

    expect([...compiled.querySelectorAll('#panel-help a')].map((a) => text(a))).toEqual(['Consulter la FAQ', 'Contacter le support']);
    expect(compiled.querySelector('#panel-language')?.textContent).toContain('Impossible de charger vos préférences');
  });

  it('affiche un chargement tant que les préférences n arrivent pas', async () => {
    await create(new Subject<Preferences>());

    open('Notifications');

    expect(compiled.querySelector('#panel-notifications')?.textContent).toContain('Chargement');
  });

  it('propose le retour à mon profil', async () => {
    await create();

    const back = compiled.querySelector('header a');
    expect(back?.textContent?.trim()).toBe('Retour à mon profil');
    expect(back?.getAttribute('href')).toBe('/producer/profile');
  });

  it('ouvre la sécurité et les données personnelles avec leur propre contenu', async () => {
    await create();

    open('Sécurité');
    open('Données personnelles');

    expect(compiled.querySelector('#panel-security app-password-section form')).not.toBeNull();
    expect(compiled.querySelector('#panel-data app-personal-data-section')?.textContent).toContain('Exporter mes données');
  });
});
