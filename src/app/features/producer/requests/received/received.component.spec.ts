import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReceivedRequest, RequestsService } from '../requests.service';
import { ReceivedComponent } from './received.component';

const request = (overrides: Partial<ReceivedRequest>): ReceivedRequest => ({
  requestId: Math.random().toString(),
  clientName: 'Client',
  product: 'Produit',
  quantity: null,
  unit: null,
  urgent: false,
  status: 'new',
  receivedAt: '2026-08-10T10:00:00+02:00',
  respondedAt: null,
  declined: false,
  ...overrides,
});

const REQUESTS: ReceivedRequest[] = [
  request({ clientName: 'Camille R.', product: 'Tomates bio', quantity: 20, unit: 'kg', receivedAt: '2026-08-18T10:00:00+02:00' }),
  request({ clientName: 'Lucas M.', product: 'Miel toutes fleurs', status: 'treated', receivedAt: '2026-08-15T10:00:00+02:00', respondedAt: '2026-08-16T10:00:00+02:00' }),
  request({ clientName: 'Coopérative S.', product: 'Pommes de terre', quantity: 50, unit: 'kg', urgent: true, receivedAt: '2026-08-15T09:00:00+02:00' }),
  request({ clientName: 'Sarah K.', product: 'Fromage de chèvre', status: 'treated', declined: true, receivedAt: '2026-08-11T10:00:00+02:00', respondedAt: '2026-08-12T10:00:00+02:00' }),
  request({ clientName: 'Hugo D.', product: 'Courgettes', status: 'closed', receivedAt: '2026-08-01T10:00:00+02:00' }),
];

describe('ReceivedComponent', () => {
  let fixture: ComponentFixture<ReceivedComponent>;
  let compiled: HTMLElement;

  async function create(data$: Observable<ReceivedRequest[]> = of(REQUESTS)): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ReceivedComponent],
      providers: [provideRouter([]), { provide: RequestsService, useValue: { getReceived: vi.fn(() => data$) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReceivedComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const rows = () => [...compiled.querySelectorAll('ul > li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
  const chip = (label: string) => [...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;

  beforeEach(() => TestBed.resetTestingModule());

  it('liste client, produit, date et badge de chaque demande', async () => {
    await create();

    const list = rows();
    expect(list.length).toBe(5);
    expect(list[0]).toContain('Camille R. · Tomates bio 20kg');
    expect(list[0]).toContain('Reçue le 18 août');
    expect(list[0]).toContain('Nouvelle');
    expect(list[1]).toContain('Lucas M. · Miel toutes fleurs');
    expect(list[1]).toContain('Répondu le 16 août');
    expect(list[1]).toContain('Traitée');
    expect(list[2]).toContain('Urgente');
    expect(list[3]).toContain('Refusée le 12 août');
  });

  it('une demande qui n\'est plus ouverte n\'a pas de badge', async () => {
    await create();

    const closed = compiled.querySelectorAll('ul > li')[4];
    expect(closed.textContent).toContain('Hugo D. · Courgettes');
    expect(closed.textContent).toContain('Reçue le 1er août');
    expect(closed.querySelector('span')).toBeNull();
  });

  it('les chips Nouvelles et Traitées filtrent la liste, Toutes la remet entière', async () => {
    await create();

    chip('Nouvelles').click();
    fixture.detectChanges();
    expect(rows().length).toBe(2);

    chip('Traitées').click();
    fixture.detectChanges();
    expect(rows().length).toBe(2);
    expect(rows()[0]).toContain('Lucas M.');

    chip('Toutes').click();
    fixture.detectChanges();
    expect(rows().length).toBe(5);
  });

  it('propose de revenir aux demandes disponibles', async () => {
    await create();

    const back = compiled.querySelector('a[href="/producer/requests"]');
    expect(back?.textContent?.trim()).toBe('Retour aux demandes disponibles');
  });

  it('dit quand il n\'y a aucune demande dans la catégorie choisie', async () => {
    await create(of([REQUESTS[0]]));

    chip('Traitées').click();
    fixture.detectChanges();

    expect(rows()).toEqual(['Aucune demande dans cette catégorie.']);
  });

  it('affiche un message quand le back est injoignable', async () => {
    await create(throwError(() => new Error('API down')));

    expect(compiled.textContent).toContain('Impossible de charger les demandes');
  });
});
