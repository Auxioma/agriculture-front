import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuoteDetail, RequestsService } from '../../requests.service';
import { QuoteDetailComponent } from './quote-detail.component';

const quote = (overrides: Partial<QuoteDetail> = {}): QuoteDetail => ({
  replyId: 'r1',
  requestId: 'req1',
  clientName: 'Camille R.',
  product: 'Tomates bio',
  quantity: 20,
  unit: 'kg',
  priceAmount: 12,
  priceUnit: 'kg',
  currency: '€',
  status: 'seen',
  sentAt: '2026-08-12T12:00:00+00:00',
  validUntil: '2026-08-19T00:00:00+00:00',
  clientType: 'individual',
  availableQuantity: 20,
  availabilityDate: '2026-08-23T12:00:00+00:00',
  pickupConditions: 'À la ferme',
  deliveryConditions: 'Possible < 15 km',
  replyText: 'Parfait, je peux vous proposer ce produit.',
  attachments: [{ fileName: 'devis-tomates.pdf', fileUrl: 'https://files.test/devis-tomates.pdf' }],
  ...overrides,
});

describe('QuoteDetailComponent', () => {
  let fixture: ComponentFixture<QuoteDetailComponent>;
  let compiled: HTMLElement;
  let serviceMock: { getQuote: ReturnType<typeof vi.fn> };

  async function create(data$: Observable<QuoteDetail> = of(quote())): Promise<void> {
    serviceMock = { getQuote: vi.fn(() => data$) };
    await TestBed.configureTestingModule({
      imports: [QuoteDetailComponent],
      providers: [
        provideRouter([]),
        { provide: RequestsService, useValue: serviceMock },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'r1' })) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuoteDetailComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = () => compiled.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const button = (label: string) => [...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);

  beforeEach(() => TestBed.resetTestingModule());

  it('charge le devis de l\'url et affiche le client, son statut et le titre', async () => {
    await create();

    expect(serviceMock.getQuote).toHaveBeenCalledWith('r1');
    expect(text()).toContain('CR');
    expect(text()).toContain('Camille R.');
    expect(text()).toContain('Client particulier');
    expect(text()).toContain('Vue');
    expect(compiled.querySelector('h2')?.textContent).toContain('Tomates bio - 20kg');
  });

  it('formate les lignes du devis comme la maquette', async () => {
    await create();

    const rows = [...compiled.querySelectorAll('dl > div')].map((row) =>
      [...row.querySelectorAll('dt, dd')].map((cell) => cell.textContent?.trim()).join(' '),
    );
    expect(rows).toEqual([
      'Prix indicatif 12 €/kg',
      'Quantité disponible 20 kg',
      'Date disponible 23 août 2026',
      'Durée de validité 7 jours',
      'Conditions de retrait À la ferme',
      'Conditions de livraison Possible < 15 km',
    ]);
  });

  it('montre le message du producteur et la pièce jointe', async () => {
    await create();

    expect(text()).toContain('Votre message');
    expect(text()).toContain('Parfait, je peux vous proposer ce produit.');
    expect(compiled.querySelector('a[href="https://files.test/devis-tomates.pdf"]')?.textContent).toContain('devis-tomates.pdf');
  });

  it('masque les lignes et le message absents', async () => {
    await create(
      of(quote({ availableQuantity: null, availabilityDate: null, validUntil: null, pickupConditions: null, deliveryConditions: null, replyText: null, attachments: [] })),
    );

    expect([...compiled.querySelectorAll('dt')].map((dt) => dt.textContent?.trim())).toEqual(['Prix indicatif']);
    expect(text()).not.toContain('Votre message');
  });

  it('propose de modifier, relancer et archiver un devis envoyé ou vu, mais pas "Accepter" (c\'est le client qui accepte)', async () => {
    await create();

    expect(button('Modifier ce devis')).toBeTruthy();
    expect(button('Relancer le client')).toBeTruthy();
    expect(button('Archiver ce devis')).toBeTruthy();
    expect(text()).not.toContain('Accepter le devis');
  });

  it('ne propose plus de modifier ni de relancer un devis déjà tranché par le client', async () => {
    await create(of(quote({ status: 'accepted' })));

    expect(button('Modifier ce devis')).toBeUndefined();
    expect(button('Relancer le client')).toBeUndefined();
    expect(button('Archiver ce devis')).toBeTruthy();
  });

  it('un devis archivé n\'a plus de bouton', async () => {
    await create(of(quote({ status: 'archived' })));

    expect(compiled.querySelectorAll('button').length).toBe(0);
  });

  it('garde un lien de retour vers la liste des devis', async () => {
    await create();

    expect(compiled.querySelector('a[href="/producer/requests/quotes"]')?.textContent?.trim()).toBe('Retour à mes devis');
  });

  it('affiche un message quand le devis est introuvable', async () => {
    await create(throwError(() => new Error('404')));

    expect(text()).toContain('Ce devis est introuvable.');
  });
});
