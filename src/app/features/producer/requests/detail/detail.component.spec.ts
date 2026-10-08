import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DetailComponent } from './detail.component';
import { RequestDetail, RequestsService } from '../requests.service';

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
  attachments: [{ fileName: 'photo-parcelle.jpg', fileUrl: 'https://files.test/photo-parcelle.jpg' }],
  status: 'new',
  respondedAt: null,
  declined: false,
  draft: null,
  ...overrides,
});

describe('DetailComponent', () => {
  let fixture: ComponentFixture<DetailComponent>;
  let compiled: HTMLElement;
  let serviceMock: { getDetail: ReturnType<typeof vi.fn> };

  async function create(data$: Observable<RequestDetail> = of(detail())): Promise<void> {
    serviceMock = { getDetail: vi.fn(() => data$) };
    await TestBed.configureTestingModule({
      imports: [DetailComponent],
      providers: [
        provideRouter([]),
        { provide: RequestsService, useValue: serviceMock },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'abc' })) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = () => compiled.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const button = (label: string) => [...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);

  beforeEach(() => TestBed.resetTestingModule());

  it('charge la demande de l\'url et affiche le client, le besoin et la pièce jointe', async () => {
    await create();

    expect(serviceMock.getDetail).toHaveBeenCalledWith('abc');
    expect(text()).toContain('Camille R.');
    expect(text()).toContain('Client particulier');
    expect(text()).toContain('Urgent');
    expect(compiled.querySelector('h2')?.textContent).toContain('Tomates bio');
    const attachment = compiled.querySelector('a[href="https://files.test/photo-parcelle.jpg"]');
    expect(attachment?.textContent).toContain('photo-parcelle.jpg');
  });

  it('formate les lignes du besoin comme la maquette', async () => {
    await create();

    const rows = [...compiled.querySelectorAll('dl > div')].map((row) =>
      [...row.querySelectorAll('dt, dd')].map((cell) => cell.textContent?.trim()).join(' '),
    );
    expect(rows).toEqual([
      'Quantité 20 kg',
      'Budget indicatif 12 €/kg',
      'Date souhaitée 23 août 2026',
      'Localisation Lyon (69) · 4 km',
      'Retrait / livraison Retrait à la ferme',
    ]);
  });

  it('masque les lignes sans information et montre le message du client', async () => {
    await create(
      of(detail({ budgetMax: null, desiredDate: null, department: null, pickupWanted: false, message: 'Pour samedi svp', urgent: false, clientType: 'professional' })),
    );

    const labels = [...compiled.querySelectorAll('dt')].map((dt) => dt.textContent?.trim());
    expect(labels).toEqual(['Quantité', 'Localisation']);
    expect(text()).toContain('Lyon · 4 km');
    expect(text()).toContain('Pour samedi svp');
    expect(text()).toContain('Client professionnel');
    expect(text()).not.toContain('Urgent');
  });

  it('propose de répondre, d\'ouvrir le chat et de signaler quand la demande est à traiter', async () => {
    await create();

    expect(compiled.querySelector('a[href="/producer/requests/abc/reply"]')?.textContent?.trim()).toBe('Répondre à la demande');
    expect(button('Ouvrir le chat')).toBeTruthy();
    expect(button('Signaler cette demande')).toBeTruthy();
  });

  it('dit que la demande est traitée et retire les boutons de réponse', async () => {
    await create(of(detail({ status: 'treated', respondedAt: '2026-08-16T12:00:00+00:00', urgent: false })));

    expect(text()).toContain('Vous avez répondu à cette demande le 16 août.');
    expect(compiled.querySelector('a[href$="/reply"]')).toBeNull();
    expect(button('Signaler cette demande')).toBeTruthy();
  });

  it('dit quand la demande a été refusée ou n\'est plus ouverte', async () => {
    await create(of(detail({ status: 'treated', declined: true, respondedAt: '2026-08-12T12:00:00+00:00' })));
    expect(text()).toContain('Vous avez refusé cette demande le 12 août.');

    TestBed.resetTestingModule();
    await create(of(detail({ status: 'closed' })));
    expect(text()).toContain("Cette demande n'est plus ouverte.");
    expect(button('Ouvrir le chat')).toBeUndefined();
  });

  it('garde un lien de retour vers les demandes disponibles', async () => {
    await create();

    expect(compiled.querySelector('a[href="/producer/requests"]')?.textContent?.trim()).toBe('Retour aux demandes disponibles');
  });

  it('affiche un message quand la demande est introuvable', async () => {
    await create(throwError(() => new Error('403')));

    expect(text()).toContain('Cette demande est introuvable ou ne vous est pas accessible.');
  });
});
