import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentSubscription, SubscriptionService } from '../subscription/subscription.service';
import { SAVE_FILE } from './file-download';
import { PersonalDataSectionComponent } from './personal-data-section.component';
import { SettingsService } from './settings.service';

const subscription = (status: CurrentSubscription['status'] = 'active'): CurrentSubscription => ({
  planPriceId: 'pp1',
  planCode: 'pro',
  planName: 'Pro',
  billingCycle: 'monthly',
  amount: '20.00',
  currencyCode: 'EUR',
  status,
  currentPeriodEnd: '2026-11-14T08:50:14+01:00',
  cancelAtPeriodEnd: false,
  requestsThisMonth: 3,
  requestsQuota: 30,
});

describe('PersonalDataSectionComponent', () => {
  let fixture: ComponentFixture<PersonalDataSectionComponent>;
  let compiled: HTMLElement;
  let service: { exportData: ReturnType<typeof vi.fn>; deleteAccount: ReturnType<typeof vi.fn> };
  let getCurrent: ReturnType<typeof vi.fn>;
  let logout: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let saveFile: ReturnType<typeof vi.fn>;

  async function create(current$: Observable<CurrentSubscription | null> = of(null)): Promise<void> {
    service = {
      exportData: vi.fn(() => of(new Blob(['{}']))),
      deleteAccount: vi.fn(() => of(null)),
    };
    getCurrent = vi.fn(() => current$);
    logout = vi.fn();
    saveFile = vi.fn();
    await TestBed.configureTestingModule({
      imports: [PersonalDataSectionComponent],
      providers: [
        provideRouter([]),
        { provide: SettingsService, useValue: service },
        { provide: SubscriptionService, useValue: { getCurrent } },
        { provide: AuthService, useValue: { logout } },
        { provide: SAVE_FILE, useValue: saveFile },
      ],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as unknown as ReturnType<typeof vi.fn>;

    fixture = TestBed.createComponent(PersonalDataSectionComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => vi.clearAllMocks());

  const button = (label: string) => [...compiled.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label);
  const click = (label: string) => {
    button(label)!.click();
    fixture.detectChanges();
  };
  const typePassword = (value: string) => {
    const input = compiled.querySelector<HTMLInputElement>('#delete-password')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const card = () => compiled.querySelector('[role=group]');

  it('enregistre un fichier JSON avec l export', async () => {
    await create();

    click('Exporter mes données');

    expect(service.exportData).toHaveBeenCalled();
    expect(saveFile).toHaveBeenCalledWith(expect.any(Blob), 'trouvemoi-mes-donnees.json');
  });

  it('dit que l export a échoué sans rien enregistrer', async () => {
    await create();
    service.exportData.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));

    click('Exporter mes données');

    expect(saveFile).not.toHaveBeenCalled();
    expect(compiled.querySelector('[role=alert]')?.textContent).toContain("L'export n'a pas pu être préparé");
  });

  it('ne montre la carte de suppression qu après le clic sur « Supprimer mon compte »', async () => {
    await create();
    expect(card()).toBeNull();

    click('Supprimer mon compte');

    expect(card()).not.toBeNull();
    expect(card()?.textContent).toContain('Vos factures sont conservées');
    expect(getCurrent).toHaveBeenCalled();
  });

  it('supprime un compte sans abonnement avec le mot de passe seul, puis quitte la session', async () => {
    await create(of(null));
    click('Supprimer mon compte');
    expect(card()?.textContent).not.toContain('résilié immédiatement');
    typePassword('motdepasse123');

    click('Supprimer définitivement mon compte');

    expect(service.deleteAccount).toHaveBeenCalledWith('motdepasse123', false);
    expect(logout).toHaveBeenCalledWith(false);
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('prévient d un abonnement en cours (plan, fin de période, sans remboursement) et fait du bouton un « J accepte »', async () => {
    await create(of(subscription('active')));
    click('Supprimer mon compte');

    expect(card()?.textContent).toContain('Votre abonnement Pro est résilié immédiatement, sans remboursement de la période déjà payée (jusqu\'au 14 novembre 2026)');
    typePassword('motdepasse123');
    click("J'accepte et supprime mon compte");

    expect(service.deleteAccount).toHaveBeenCalledWith('motdepasse123', true);
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it.each(['trialing', 'past_due'] as const)('traite un abonnement %s comme un abonnement en cours', async (status) => {
    await create(of(subscription(status)));

    click('Supprimer mon compte');

    expect(button("J'accepte et supprime mon compte")).toBeDefined();
  });

  it.each(['cancelled', 'expired'] as const)('ignore un abonnement %s : il n y a rien à résilier', async (status) => {
    await create(of(subscription(status)));

    click('Supprimer mon compte');

    expect(card()?.textContent).not.toContain('résilié immédiatement');
    expect(button('Supprimer définitivement mon compte')).toBeDefined();
  });

  it('n envoie rien tant que l abonnement n est pas connu, pour ne pas confirmer à l aveugle', async () => {
    await create(new Subject<CurrentSubscription | null>());

    click('Supprimer mon compte');

    expect(button('Supprimer définitivement mon compte')?.disabled).toBe(true);
  });

  it('demande le mot de passe avant tout appel', async () => {
    await create();
    click('Supprimer mon compte');

    click('Supprimer définitivement mon compte');

    expect(service.deleteAccount).not.toHaveBeenCalled();
    expect(card()?.textContent).toContain('Entrez votre mot de passe pour confirmer.');
  });

  it('affiche le message du back quand le mot de passe est faux, et reste connecté', async () => {
    await create();
    service.deleteAccount.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 422, error: { error: 'Mot de passe incorrect.' } })));
    click('Supprimer mon compte');
    typePassword('mauvais');

    click('Supprimer définitivement mon compte');

    expect(card()?.querySelector('[role=alert]')?.textContent).toContain('Mot de passe incorrect.');
    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(button('Supprimer définitivement mon compte')?.disabled).toBe(false);
  });

  it('montre l abonnement quand le back en trouve un que la carte ignorait (409), sans supprimer', async () => {
    await create(throwError(() => new Error('API injoignable')));
    service.deleteAccount.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'subscription_active', subscription: { planName: 'Premium', currentPeriodEnd: '2027-01-10T10:00:00+01:00' } } })),
    );
    click('Supprimer mon compte');
    typePassword('motdepasse123');

    click('Supprimer définitivement mon compte');

    expect(logout).not.toHaveBeenCalled();
    expect(card()?.textContent).toContain('Votre abonnement Premium est résilié immédiatement');
    expect(card()?.textContent).toContain('Relisez');
    expect(button("J'accepte et supprime mon compte")).toBeDefined();

    click("J'accepte et supprime mon compte");
    expect(service.deleteAccount).toHaveBeenLastCalledWith('motdepasse123', true);
  });

  it('referme la carte avec Annuler, sans rien supprimer', async () => {
    await create();
    click('Supprimer mon compte');

    click('Annuler');

    expect(card()).toBeNull();
    expect(service.deleteAccount).not.toHaveBeenCalled();
    expect(button('Supprimer mon compte')).toBeDefined();
  });
});
