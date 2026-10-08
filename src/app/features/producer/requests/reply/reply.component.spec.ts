import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RequestDetail, RequestsService, Unit } from '../requests.service';
import { ReplyComponent } from './reply.component';

const detail = (overrides: Partial<RequestDetail> = {}): RequestDetail => ({
  requestId: 'abc',
  clientName: 'Camille R.',
  product: 'Tomates bio',
  quantity: 20,
  unit: 'kg',
  budgetMax: 12,
  currency: '€',
  city: 'Lyon',
  distanceKm: 4,
  message: null,
  urgent: true,
  clientType: 'individual',
  isNew: true,
  highVolume: false,
  desiredDate: '2026-08-23T12:00:00+00:00',
  department: '69',
  pickupWanted: true,
  deliveryWanted: false,
  attachments: [],
  status: 'new',
  respondedAt: null,
  declined: false,
  draft: null,
  ...overrides,
});

const UNITS: Unit[] = [
  { id: 'u-kg', code: 'kg', label: 'Kilogramme' },
  { id: 'u-unit', code: 'unite', label: 'Unité' },
];

describe('ReplyComponent', () => {
  let fixture: ComponentFixture<ReplyComponent>;
  let compiled: HTMLElement;
  let serviceMock: { getDetail: ReturnType<typeof vi.fn>; getUnits: ReturnType<typeof vi.fn>; sendReply: ReturnType<typeof vi.fn> };
  let navigate: ReturnType<typeof vi.fn>;

  async function create(request: RequestDetail = detail(), reply$: Observable<unknown> = of({ id: 'r1', status: 'sent' })): Promise<void> {
    serviceMock = {
      getDetail: vi.fn(() => of(request)),
      getUnits: vi.fn(() => of(UNITS)),
      sendReply: vi.fn(() => reply$),
    };
    await TestBed.configureTestingModule({
      imports: [ReplyComponent],
      providers: [
        provideRouter([]),
        { provide: RequestsService, useValue: serviceMock },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'abc' }) } } },
      ],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as unknown as ReturnType<typeof vi.fn>;

    fixture = TestBed.createComponent(ReplyComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = () => compiled.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const field = (id: string) => compiled.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`)!;
  const fill = (id: string, value: string) => {
    const element = field(id);
    element.value = value;
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input'));
  };
  const click = (label: string) => {
    [...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!.click();
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('rappelle la demande et prend ses exemples en gris dans la demande', async () => {
    await create();

    expect(serviceMock.getDetail).toHaveBeenCalledWith('abc');
    expect(text()).toContain('Camille R. · Tomates bio · 20kg');
    expect(field('price').getAttribute('placeholder')).toBe('12');
    expect(field('quantity').getAttribute('placeholder')).toBe('20 kg');
    expect(field('pickup').getAttribute('placeholder')).toBe('Retrait à la ferme');
    expect(field('delivery').getAttribute('placeholder')).toBe('Non proposée');
    expect([...field('unit').querySelectorAll('option')].map((o) => o.textContent?.trim())).toEqual(['€ / kg', '€ / kg', '€ / unité']);
  });

  it('refuse d\'envoyer une réponse sans prix ni message, mais accepte un brouillon vide', async () => {
    await create();

    click('Envoyer la réponse');
    expect(serviceMock.sendReply).not.toHaveBeenCalled();
    expect(text()).toContain('Indiquez un prix ou un message.');

    click('Enregistrer le brouillon');
    expect(serviceMock.sendReply).toHaveBeenCalledTimes(1);
    expect(serviceMock.sendReply.mock.calls[0][1].draft).toBe(true);
  });

  it('envoie la réponse saisie puis revient sur le détail de la demande', async () => {
    await create();
    fill('price', '12,5');
    fill('unit', 'u-kg');
    fill('quantity', '20');
    fill('date', '2026-08-23');
    fill('validity', '7');
    fill('pickup', 'Retrait à la ferme');
    fill('delivery', '');
    fill('message', ' Bonjour ');

    click('Envoyer la réponse');

    const [id, payload] = serviceMock.sendReply.mock.calls[0];
    expect(id).toBe('abc');
    expect(payload).toMatchObject({
      draft: false,
      replyText: 'Bonjour',
      priceAmount: '12.5',
      priceUnitId: 'u-kg',
      currencyCode: 'EUR',
      availableQuantity: '20',
      availabilityDate: '2026-08-23',
      pickupConditions: 'Retrait à la ferme',
      deliveryConditions: null,
    });
    expect(payload.validUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(navigate).toHaveBeenCalledWith(['/producer/requests', 'abc']);
  });

  it('enregistre un brouillon sans quitter la page', async () => {
    await create();
    fill('message', 'À finir');

    click('Enregistrer le brouillon');

    expect(serviceMock.sendReply.mock.calls[0][1]).toMatchObject({ draft: true, replyText: 'À finir', priceAmount: null, currencyCode: null });
    expect(text()).toContain('Brouillon enregistré.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reprend le brouillon déjà enregistré', async () => {
    await create(
      detail({
        draft: {
          replyText: 'Premier jet',
          priceAmount: 12.5,
          priceUnitId: 'u-kg',
          availableQuantity: 20,
          availabilityDate: '2026-08-23T00:00:00+00:00',
          validUntil: new Date(Date.now() + 3 * 86_400_000 + 3_600_000).toISOString(),
          pickupConditions: 'Retrait à la ferme',
          deliveryConditions: null,
        },
      }),
    );

    expect(field('message').value).toBe('Premier jet');
    expect(field('price').value).toBe('12.5');
    expect(field('unit').value).toBe('u-kg');
    expect(field('quantity').value).toBe('20');
    expect(field('date').value).toBe('2026-08-23');
    expect(field('validity').value).toBe('4');
    expect(field('pickup').value).toBe('Retrait à la ferme');
  });

  it('refuse un nombre mal saisi sans appeler le back', async () => {
    await create();
    fill('message', 'Oui');
    fill('price', 'douze');

    click('Envoyer la réponse');

    expect(serviceMock.sendReply).not.toHaveBeenCalled();
    expect(text()).toContain('Vérifiez les nombres saisis');
  });

  it('affiche le message du back quand l\'envoi est refusé (abonnement, demande déjà traitée...)', async () => {
    await create(
      detail(),
      throwError(() => new HttpErrorResponse({ status: 403, error: { error: 'Votre abonnement ne vous permet pas de répondre aux demandes.' } })),
    );
    fill('message', 'Oui');

    click('Envoyer la réponse');

    expect(text()).toContain('Votre abonnement ne vous permet pas de répondre aux demandes.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ne propose pas le formulaire pour une demande déjà traitée', async () => {
    await create(detail({ status: 'treated' }));

    expect(text()).toContain("Cette demande est déjà traitée ou n'est plus ouverte.");
    expect(compiled.querySelector('form')).toBeNull();
    expect(compiled.querySelector('a[href="/producer/requests/abc"]')).not.toBeNull();
  });

  it('garde un lien de retour vers les demandes disponibles et désactive la pièce jointe', async () => {
    await create();

    expect(compiled.querySelector('a[href="/producer/requests"]')?.textContent?.trim()).toBe('Retour aux demandes disponibles');
    const attach = [...compiled.querySelectorAll('button')].find((b) => b.textContent?.includes('Joindre un devis'));
    expect(attach?.disabled).toBe(true);
  });
});
