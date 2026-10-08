import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Quote, RequestsService } from '../requests.service';
import { QuotesComponent } from './quotes.component';

const quote = (overrides: Partial<Quote>): Quote => ({
  replyId: Math.random().toString(),
  requestId: 'req-' + Math.random().toString(),
  clientName: 'Client',
  product: 'Produit',
  quantity: null,
  unit: null,
  priceAmount: 10,
  priceUnit: null,
  currency: '€',
  status: 'sent',
  sentAt: '2026-08-12T12:00:00+00:00',
  validUntil: null,
  ...overrides,
});

const QUOTES: Quote[] = [
  quote({ clientName: 'Camille R.', product: 'Tomates bio', quantity: 20, unit: 'kg', priceAmount: 12, priceUnit: 'kg', status: 'sent', sentAt: '2026-08-12T12:00:00+00:00' }),
  quote({ clientName: 'Lucas M.', product: 'Miel toutes fleurs', quantity: 10, unit: 'unite', priceAmount: 8, priceUnit: 'unite', status: 'seen', sentAt: '2026-08-10T12:00:00+00:00' }),
  quote({ clientName: 'Coopérative S.', product: 'Pommes de terre', quantity: 50, unit: 'kg', priceAmount: 1.2, priceUnit: 'kg', status: 'accepted', sentAt: '2026-08-08T12:00:00+00:00' }),
  quote({ clientName: 'Sarah K.', product: 'Fromage de chèvre', status: 'declined', sentAt: '2026-08-05T12:00:00+00:00' }),
  quote({ clientName: 'Marc D.', product: 'Vin rouge', quantity: 12, unit: 'unite', status: 'expired', sentAt: '2026-07-28T12:00:00+00:00' }),
];

describe('QuotesComponent', () => {
  let fixture: ComponentFixture<QuotesComponent>;
  let compiled: HTMLElement;

  async function create(data$: Observable<Quote[]> = of(QUOTES)): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [QuotesComponent],
      providers: [provideRouter([]), { provide: RequestsService, useValue: { getQuotes: vi.fn(() => data$) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(QuotesComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const rows = () => [...compiled.querySelectorAll('ul > li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
  const chip = (label: string) => [...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
  const search = (value: string) => {
    const input = compiled.querySelector<HTMLInputElement>('input[type=search]')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('liste titre, client, prix, date d\'envoi et badge de chaque devis', async () => {
    await create();

    const list = rows();
    expect(list.length).toBe(5);
    expect(list[0]).toContain('Tomates bio - 20kg');
    expect(list[0]).toContain('Camille R. · 12 €/kg · 12 août');
    expect(list[0]).toContain('Envoyée');
    expect(list[1]).toContain('Miel toutes fleurs - 10 unités');
    expect(list[1]).toContain('Lucas M. · 8 €/unité · 10 août');
    expect(list[1]).toContain('Vue');
    expect(list[2]).toContain('Coopérative S. · 1,20 €/kg · 8 août');
    expect(list[2]).toContain('Acceptée');
    expect(list[3]).toContain('Refusée');
    expect(list[4]).toContain('Expirée');
  });

  it('chaque devis mène au détail de sa demande', async () => {
    await create(of([quote({ requestId: 'abc' })]));

    expect(compiled.querySelector('ul a')?.getAttribute('href')).toBe('/producer/requests/abc');
  });

  it('"Envoyés" ne garde que les devis au statut envoyé, "Acceptés" que les acceptés', async () => {
    await create();

    chip('Envoyés').click();
    fixture.detectChanges();
    expect(rows().length).toBe(1);
    expect(rows()[0]).toContain('Tomates bio');

    chip('Acceptés').click();
    fixture.detectChanges();
    expect(rows().length).toBe(1);
    expect(rows()[0]).toContain('Pommes de terre');

    chip('Tous').click();
    fixture.detectChanges();
    expect(rows().length).toBe(5);
  });

  it('la recherche trouve par produit ou par client, sans tenir compte des accents ni des majuscules', async () => {
    await create();

    search('FROMAGE DE CHEVRE');
    expect(rows().length).toBe(1);
    expect(rows()[0]).toContain('Fromage de chèvre');

    search('cooperative');
    expect(rows().length).toBe(1);
    expect(rows()[0]).toContain('Coopérative S.');

    search('zzz');
    expect(rows()).toEqual(['Aucun devis ne correspond.']);
  });

  it('dit qu\'il n\'y a pas encore de devis', async () => {
    await create(of([]));

    expect(rows()).toEqual(["Vous n'avez pas encore envoyé de devis."]);
  });

  it('garde un lien de retour vers les demandes disponibles', async () => {
    await create();

    expect(compiled.querySelector('a[href="/producer/requests"]')?.textContent?.trim()).toBe('Retour aux demandes disponibles');
  });

  it('affiche un message quand le back est injoignable', async () => {
    await create(throwError(() => new Error('API down')));

    expect(compiled.textContent).toContain('Impossible de charger vos devis');
  });
});
