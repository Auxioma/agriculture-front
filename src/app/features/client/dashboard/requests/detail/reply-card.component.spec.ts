import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RepliesService } from './replies.service';
import { Reply } from './reply.model';
import { ReplyCardComponent } from './reply-card.component';

const REPLY: Reply = {
  id: 'rep-1',
  status: 'seen',
  sentAt: '2026-11-05T09:00:00+01:00',
  producer: { id: 'prod-1', name: 'Ferme du Soleil', slug: 'ferme-du-soleil', city: 'Lyon', verified: true, distanceKm: 11.1 },
  message: 'Oui, disponible cette semaine.',
  priceAmount: 12.5,
  priceUnit: 'kg',
  currency: '€',
  availableQuantity: 20,
  quantityUnit: 'kg',
  availabilityDate: '2026-11-14',
  validUntil: null,
  conditions: null,
  pickupConditions: 'Retrait à la ferme',
  deliveryConditions: null,
  conversationId: 'conv-1',
  review: null,
  attachments: [],
};

describe('ReplyCardComponent', () => {
  let fixture: ComponentFixture<ReplyCardComponent>;
  const replies = { review: vi.fn() };

  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent?.replace(/\s+/g, ' ');
  const button = (label: string) =>
    [...root().querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(label));

  function create(reply: Partial<Reply> = {}, open = true): void {
    fixture = TestBed.createComponent(ReplyCardComponent);
    fixture.componentRef.setInput('reply', { ...REPLY, ...reply });
    fixture.componentRef.setInput('requestId', 'req-1');
    fixture.componentRef.setInput('open', open);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RepliesService, useValue: replies }],
    });
  });

  it('montre le producteur, sa ville, la distance et le profil vérifié', () => {
    create();

    expect(text()).toContain('Ferme du Soleil');
    expect(text()).toContain('Lyon · à 11,1 km');
    expect(text()).toContain('Profil vérifié');
    expect(root().querySelector('h3 a')?.getAttribute('href')).toBe('/producers/ferme-du-soleil');
  });

  it('montre le prix, la quantité, la date, les conditions et le message, sans les lignes vides', () => {
    create();

    expect(text()).toMatch(/12,50\s€ \/ kg/);
    expect(text()).toMatch(/Quantité disponible\s*20 kg/);
    expect(text()).toMatch(/Disponible le\s*14 novembre/);
    expect(text()).toMatch(/Retrait\s*Retrait à la ferme/);
    expect(text()).not.toContain('Livraison');
    expect(text()).not.toContain("Valable jusqu'au");
    expect(text()).toContain('Oui, disponible cette semaine.');
  });

  it("le dit quand le producteur n'a pas indiqué de prix", () => {
    create({ priceAmount: null, priceUnit: null });

    expect(text()).toContain("n'a pas indiqué de prix");
  });

  it('signale une réponse pas encore consultée comme nouvelle', () => {
    create({ status: 'sent' });

    expect(text()).toContain('Nouvelle');
  });

  it('propose Discuter vers le fil de la conversation quand il existe', () => {
    create();

    const chat = [...root().querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Discuter');
    expect(chat?.getAttribute('href')).toBe('/client/messages/conv-1');
  });

  it('Accepter et Refuser préviennent le parent avec la réponse', () => {
    create();
    const accepted = vi.fn();
    const declined = vi.fn();
    fixture.componentInstance.accept.subscribe(accepted);
    fixture.componentInstance.decline.subscribe(declined);

    button('Accepter')!.click();
    button('Refuser')!.click();

    expect(accepted).toHaveBeenCalledWith('rep-1');
    expect(declined).toHaveBeenCalledWith('rep-1');
  });

  it("ne propose plus de choisir quand la demande n'est plus ouverte, ni quand la réponse est déjà tranchée", () => {
    create({}, false);
    expect(button('Accepter')).toBeUndefined();

    create({ status: 'declined' }, true);
    expect(button('Accepter')).toBeUndefined();
    expect(text()).toContain('Refusée');
  });

  it("n'offre pas l'avis tant que la réponse n'est pas acceptée", () => {
    create({ status: 'seen' });

    expect(button('Laisser un avis')).toBeUndefined();
  });

  describe('une fois la réponse acceptée', () => {
    it('propose de laisser un avis, dont le formulaire s’ouvre puis se referme', () => {
      create({ status: 'accepted' });

      button('Laisser un avis')!.click();
      fixture.detectChanges();
      expect(root().querySelector('app-review-form')).toBeTruthy();

      button('Annuler')!.click();
      fixture.detectChanges();
      expect(root().querySelector('app-review-form')).toBeNull();
    });

    it('rend l’avis envoyé au parent', () => {
      replies.review.mockReturnValue(of({ id: 'rev-1', status: 'pending' }));
      create({ status: 'accepted' });
      const reviewSent = vi.fn();
      fixture.componentInstance.reviewSent.subscribe(reviewSent);

      button('Laisser un avis')!.click();
      fixture.detectChanges();
      root().querySelector<HTMLButtonElement>('button[aria-label="5 étoiles"]')!.click();
      root().querySelector('form')!.dispatchEvent(new Event('submit'));

      expect(reviewSent).toHaveBeenCalledWith({ replyId: 'rep-1', review: { rating: 5, status: 'pending' } });
    });

    it('montre l’avis déjà laissé et où il en est de la modération, sans reproposer le formulaire', () => {
      create({ status: 'accepted', review: { rating: 4, status: 'pending' } });

      expect(text()).toContain('Votre avis');
      expect(text()).toContain('★★★★☆');
      expect(text()).toContain('en attente de modération');
      expect(button('Laisser un avis')).toBeUndefined();
    });
  });
});
