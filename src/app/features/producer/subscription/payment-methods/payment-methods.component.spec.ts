import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentCard, SubscriptionService } from '../subscription.service';
import { PaymentMethodsComponent } from './payment-methods.component';

const VISA: PaymentCard = { id: 'pm_visa', brand: 'visa', last4: '4242', expMonth: 8, expYear: 2028, isDefault: true };
const MASTERCARD: PaymentCard = { id: 'pm_mc', brand: 'mastercard', last4: '4444', expMonth: 12, expYear: 2030, isDefault: false };

describe('PaymentMethodsComponent', () => {
  let fixture: ComponentFixture<PaymentMethodsComponent>;
  let compiled: HTMLElement;
  let serviceMock: Record<'getCards' | 'addCard' | 'makeCardDefault' | 'deleteCard', ReturnType<typeof vi.fn>>;
  let redirect: ReturnType<typeof vi.fn>;

  async function create(cards$: Observable<PaymentCard[]> = of([VISA, MASTERCARD]), query: Record<string, string> = {}): Promise<void> {
    serviceMock = {
      getCards: vi.fn(() => cards$),
      addCard: vi.fn(() => of({ setupUrl: 'https://stripe.test/setup' })),
      makeCardDefault: vi.fn(() => of(undefined)),
      deleteCard: vi.fn(() => of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [PaymentMethodsComponent],
      providers: [
        provideRouter([]),
        { provide: SubscriptionService, useValue: serviceMock },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentMethodsComponent);
    redirect = vi.spyOn(fixture.componentInstance as unknown as { redirect: () => void }, 'redirect').mockImplementation(() => undefined) as unknown as ReturnType<typeof vi.fn>;
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = () => compiled.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const button = (label: string) => [...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  const click = (element: HTMLElement | undefined) => {
    element!.click();
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('liste les cartes avec leur marque, leur fin de validité et la carte par défaut', async () => {
    await create();

    const cards = [...compiled.querySelectorAll('.rounded-xl')].map((card) => card.textContent?.replace(/\s+/g, ' ').trim());
    expect(cards[0]).toContain('Visa •••• 4242');
    expect(cards[0]).toContain('Expire 08/2028');
    expect(cards[0]).toContain('Par défaut');
    expect(cards[1]).toContain('Mastercard •••• 4444');
    expect(cards[1]).toContain('Expire 12/2030');
    expect(cards[1]).not.toContain('Par défaut');
  });

  it('la carte par défaut ne se supprime pas, les autres oui', async () => {
    await create();

    expect(compiled.querySelectorAll('button').length).toBe(3);
    expect([...compiled.querySelectorAll('button')].map((b) => b.textContent?.trim())).toEqual(['Définir par défaut', 'Supprimer', '+ Ajouter une carte']);
  });

  it('choisit une autre carte par défaut puis recharge la liste', async () => {
    await create();

    click(button('Définir par défaut'));

    expect(serviceMock.makeCardDefault).toHaveBeenCalledWith('pm_mc');
    expect(text()).toContain('Carte par défaut mise à jour.');
    expect(serviceMock.getCards).toHaveBeenCalledTimes(2);
  });

  it('supprime une carte après confirmation', async () => {
    await create();

    click(button('Supprimer'));
    expect(text()).toContain('Supprimer cette carte ?');
    expect(serviceMock.deleteCard).not.toHaveBeenCalled();
    click(button('Confirmer'));

    expect(serviceMock.deleteCard).toHaveBeenCalledWith('pm_mc');
    expect(text()).toContain('Carte supprimée.');
    expect(serviceMock.getCards).toHaveBeenCalledTimes(2);
  });

  it('on peut renoncer à supprimer', async () => {
    await create();

    click(button('Supprimer'));
    click(button('Annuler'));

    expect(serviceMock.deleteCard).not.toHaveBeenCalled();
    expect(button('Supprimer')).toBeTruthy();
  });

  it('ajouter une carte envoie sur la page Stripe', async () => {
    await create();

    click(button('+ Ajouter une carte'));

    expect(serviceMock.addCard).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('https://stripe.test/setup');
  });

  it('affiche le message du back quand une action est refusée', async () => {
    await create();
    serviceMock.deleteCard.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { error: "Choisissez d'abord une autre carte par défaut." } })));

    click(button('Supprimer'));
    click(button('Confirmer'));

    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain("Choisissez d'abord une autre carte par défaut.");
  });

  it('au retour de la page Stripe, confirme l\'ajout ou son abandon', async () => {
    await create(of([VISA]), { card: 'added' });
    expect(text()).toContain('Carte ajoutée.');

    TestBed.resetTestingModule();
    await create(of([VISA]), { card: 'cancelled' });
    expect(text()).toContain('Ajout de la carte annulé.');
  });

  it('sans carte, le dit et propose d\'en ajouter une', async () => {
    await create(of([]));

    expect(text()).toContain('Aucune carte enregistrée.');
    expect(button('+ Ajouter une carte')).toBeTruthy();
  });

  it('dit pourquoi les cartes ne se chargent pas (pas d\'abonnement, paiement indisponible...)', async () => {
    await create(throwError(() => new HttpErrorResponse({ status: 404, error: { error: 'Aucun abonnement à gérer.' } })));

    expect(text()).toContain('Aucun abonnement à gérer.');
    expect(button('+ Ajouter une carte')).toBeUndefined();
  });

  it('garde un lien de retour vers Mon abonnement', async () => {
    await create();

    expect(compiled.querySelector('a[href="/producer/subscription"]')?.textContent?.trim()).toBe('Retour à mon abonnement');
  });
});
