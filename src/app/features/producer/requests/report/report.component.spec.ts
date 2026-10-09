import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RequestDetail, RequestsService } from '../requests.service';
import { ReportComponent } from './report.component';

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
  urgent: false,
  clientType: 'individual',
  isNew: true,
  highVolume: false,
  desiredDate: null,
  department: '69',
  pickupWanted: false,
  deliveryWanted: false,
  attachments: [],
  status: 'new',
  respondedAt: null,
  declined: false,
  draft: null,
  ...overrides,
});

describe('ReportComponent', () => {
  let fixture: ComponentFixture<ReportComponent>;
  let compiled: HTMLElement;
  let serviceMock: { getDetail: ReturnType<typeof vi.fn>; reportRequest: ReturnType<typeof vi.fn> };

  async function create(request$: Observable<RequestDetail> = of(detail()), report$: Observable<unknown> = of({ id: 'r1' })): Promise<void> {
    serviceMock = { getDetail: vi.fn(() => request$), reportRequest: vi.fn(() => report$) };
    await TestBed.configureTestingModule({
      imports: [ReportComponent],
      providers: [
        provideRouter([]),
        { provide: RequestsService, useValue: serviceMock },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'abc' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = () => compiled.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const radios = () => [...compiled.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  const choose = (index: number) => {
    radios()[index].dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const submit = () => {
    compiled.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('rappelle la demande signalée', async () => {
    await create();

    expect(serviceMock.getDetail).toHaveBeenCalledWith('abc');
    expect(text()).toContain('Tomates bio');
    expect(text()).toContain('Demande de Camille R. · 20 kg · Lyon (69)');
  });

  it('propose les cinq motifs, sans en cocher un d\'avance', async () => {
    await create();

    expect(radios().length).toBe(5);
    expect(radios().some((radio) => radio.checked)).toBe(false);
    expect(text()).toContain('Demande frauduleuse ou fictive');
    expect(text()).toContain('Contenu inapproprié ou injurieux');
    expect(text()).toContain('Demande hors périmètre agricole');
    expect(text()).toContain('Autre');
    expect(text()).toContain('Le client cherche à échanger en dehors de TrouveMoi Agri.');
  });

  it('demande un motif avant d\'envoyer', async () => {
    await create();

    submit();

    expect(serviceMock.reportRequest).not.toHaveBeenCalled();
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Choisissez un motif');

    choose(0);

    expect(compiled.querySelector('[role="alert"]')).toBeNull();
  });

  it('envoie le motif choisi et la description, puis confirme', async () => {
    await create();

    choose(2);
    const box = compiled.querySelector<HTMLTextAreaElement>('#message')!;
    box.value = '  Il me demande mon numéro  ';
    box.dispatchEvent(new Event('input'));
    submit();

    expect(serviceMock.reportRequest).toHaveBeenCalledWith('abc', { reason: 'circumvention', message: 'Il me demande mon numéro' });
    expect(compiled.querySelector('[role="status"]')?.textContent).toContain('Signalement envoyé');
    expect(compiled.querySelector('form')).toBeNull();
    expect(compiled.querySelector('a[href="/producer/requests/abc"]')).toBeTruthy();
  });

  it('envoie une description vide à null', async () => {
    await create();

    choose(4);
    submit();

    expect(serviceMock.reportRequest).toHaveBeenCalledWith('abc', { reason: 'other', message: null });
  });

  it('affiche le message du serveur quand le signalement est refusé', async () => {
    await create(of(detail()), throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'Vous avez déjà signalé cette demande.' } })));

    choose(0);
    submit();

    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Vous avez déjà signalé cette demande.');
    expect(compiled.querySelector('form')).toBeTruthy();
    expect(compiled.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false);
  });

  it('permet d\'annuler et de revenir à la demande', async () => {
    await create();

    const links = [...compiled.querySelectorAll('a')].filter((a) => a.getAttribute('href') === '/producer/requests/abc');
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Retour à la demande', 'Annuler']);
  });

  it('dit quand la demande est introuvable', async () => {
    await create(throwError(() => new HttpErrorResponse({ status: 404 })));

    expect(text()).toContain('Cette demande est introuvable');
    expect(compiled.querySelector('form')).toBeNull();
  });
});
