import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../../core/auth/auth.service';
import { Preferences } from './profile.model';
import { ProfileComponent } from './profile.component';
import { ProfileService } from './profile.service';

const prefs: Preferences = {
  locale: 'fr',
  currency: 'EUR',
  notifications: {
    producer_replied: true,
    new_message: true,
    quote_received: true,
    request_expiring_soon: false,
    favorite_producer_available: true,
    review_reminder: true,
  },
};

describe('ProfileComponent', () => {
  const profileMock = {
    me: vi.fn(),
    preferences: vi.fn(),
    currencies: vi.fn(),
    updatePreferences: vi.fn(),
    addresses: vi.fn(),
  };

  beforeEach(() => {
    profileMock.me.mockReturnValue(
      of({
        id: '1',
        email: 'marie.r@email.com',
        firstName: 'Marie',
        lastName: 'Rousseau',
        roles: [],
      }),
    );
    profileMock.preferences.mockReturnValue(of(prefs));
    profileMock.currencies.mockReturnValue(of([{ code: 'EUR', name: 'Euro', symbol: '€' }]));
    profileMock.addresses.mockReturnValue(of([]));

    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: ProfileService, useValue: profileMock },
        { provide: AuthService, useValue: { logout: vi.fn() } },
      ],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    return fixture;
  }

  it("affiche le nom abrégé et l'email", () => {
    const text = create().nativeElement.textContent;
    expect(text).toContain('Marie R.');
    expect(text).toContain('marie.r@email.com');
  });

  it("construit le libellé de la devise depuis la liste de l'API", () => {
    const { componentInstance: c } = create();
    expect(c.currencyLabel()).toBe('Euro (€)');
  });

  it('ouvre un seul accordéon à la fois', () => {
    const { componentInstance: c } = create();
    c.toggle('security');
    c.toggle('language');
    expect(c.openSection()).toBe('language');
    c.toggle('language');
    expect(c.openSection()).toBeNull();
  });

  it('met à jour les préférences avec la réponse du serveur', () => {
    profileMock.updatePreferences.mockReturnValue(of({ ...prefs, currency: 'GBP' }));
    const { componentInstance: c } = create();
    c.savePreferences({ currency: 'GBP' });
    expect(profileMock.updatePreferences).toHaveBeenCalledWith({ currency: 'GBP' });
    expect(c.preferences()?.currency).toBe('GBP');
  });

  it("envoie un seul interrupteur de notification, avec le nom du back, et garde les autres", () => {
    profileMock.updatePreferences.mockReturnValue(
      of({ ...prefs, notifications: { ...prefs.notifications, new_message: false } }),
    );
    const { componentInstance: c } = create();
    c.setNotifications({ new_message: false });
    expect(profileMock.updatePreferences).toHaveBeenCalledWith({
      notifications: { new_message: false },
    });
    expect(c.preferences()?.notifications.new_message).toBe(false);
    expect(c.preferences()?.notifications.producer_replied).toBe(true);
  });

  it("revient à l'état précédent (rollback) si l'API échoue", () => {
    profileMock.updatePreferences.mockReturnValue(throwError(() => new Error('500')));
    const { componentInstance: c } = create();
    c.savePreferences({ locale: 'en' });
    expect(c.preferences()?.locale).toBe('fr');
    expect(c.error()).not.toBeNull();
  });
});
