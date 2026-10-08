import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AvailableRequest } from '../dashboard/dashboard.model';
import { RequestsComponent } from './requests.component';
import { RequestsService } from './requests.service';

const request = (overrides: Partial<AvailableRequest>): AvailableRequest => ({
  requestId: Math.random().toString(),
  clientName: 'Client',
  product: 'Produit',
  quantity: null,
  unit: null,
  budgetMax: null,
  currency: null,
  city: null,
  distanceKm: null,
  message: null,
  urgent: false,
  clientType: 'individual',
  isNew: false,
  highVolume: false,
  ...overrides,
});

const REQUESTS: AvailableRequest[] = [
  request({ product: 'Tomates bio', quantity: 20, unit: 'kg', budgetMax: 12, currency: '€', city: 'Lyon', distanceKm: 4, urgent: true }),
  request({ product: 'Pommes de terre', quantity: 50, unit: 'kg', city: 'Bron', distanceKm: 12, clientType: 'professional', highVolume: true }),
  request({ product: 'Miel toutes fleurs', quantity: 10, unit: 'unite', city: 'Villeurbanne', distanceKm: 7, clientType: 'professional', isNew: true }),
];

describe('RequestsComponent', () => {
  let fixture: ComponentFixture<RequestsComponent>;
  let compiled: HTMLElement;

  async function create(data$: Observable<AvailableRequest[]> = of(REQUESTS)): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [RequestsComponent],
      providers: [provideRouter([]), { provide: RequestsService, useValue: { getAvailable: vi.fn(() => data$) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(RequestsComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const rows = () => [...compiled.querySelectorAll('ul > li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
  const chip = (label: string) => [...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
  const choose = (label: string, value: string) => {
    const select = compiled.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('liste les demandes avec titre, détails (type de client compris) et un badge par carte', async () => {
    await create();

    const list = rows();
    expect(list.length).toBe(3);
    expect(list[0]).toContain('Tomates bio - 20kg');
    expect(list[0]).toContain('Lyon · 4 km · Particulier · budget 12€/kg');
    expect(list[0]).toContain('Urgent');
    expect(list[1]).toContain('Bron · 12 km · Professionnel');
    expect(list[1]).toContain('Volume élevé');
    expect(list[2]).toContain('Miel toutes fleurs - 10 unités');
    expect(list[2]).toContain('Nouveau');
  });

  it('les chips se cumulent et "Tout" les remet à zéro', async () => {
    await create();

    chip('Urgentes').click();
    fixture.detectChanges();
    expect(rows().length).toBe(1);

    chip('< 10 km').click();
    chip('Budget').click();
    fixture.detectChanges();
    expect(rows().length).toBe(1);

    chip('Urgentes').click();
    fixture.detectChanges();
    expect(rows().length).toBe(1); // < 10 km + budget : seulement les tomates

    chip('Tout').click();
    fixture.detectChanges();
    expect(rows().length).toBe(3);
  });

  it('filtre par produit et par type de client', async () => {
    await create();

    choose('Type de client', 'professional');
    expect(rows().length).toBe(2);

    choose('Produit', 'Miel toutes fleurs');
    expect(rows().length).toBe(1);
    expect(rows()[0]).toContain('Miel toutes fleurs');
  });

  it('dit quand aucune demande ne correspond aux filtres', async () => {
    await create();

    chip('Volumes').click();
    chip('Urgentes').click();
    fixture.detectChanges();

    expect(rows()).toEqual(['Aucune demande ne correspond à ces filtres.']);
  });

  it('propose "Voir mes devis" (bouton mobile) vers /my-quotes, comme la navbar', async () => {
    await create();

    expect(compiled.querySelector('a[href="/my-quotes"]')?.textContent?.trim()).toBe('Voir mes devis');
  });

  it('affiche un message quand le back est injoignable', async () => {
    await create(throwError(() => new Error('API down')));

    expect(compiled.textContent).toContain('Impossible de charger les demandes');
  });
});
