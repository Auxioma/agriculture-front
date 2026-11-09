import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, map, of, throwError, Subject } from 'rxjs';
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
  locked: false,
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

  let service: { getAvailablePage: ReturnType<typeof vi.fn> };

  // total : celui que le back annonce pour toutes les pages (null = liste entiere recue)
  async function create(data$: Observable<AvailableRequest[]> = of(REQUESTS), total: number | null = null): Promise<void> {
    service = { getAvailablePage: vi.fn(() => data$.pipe(map((items) => ({ items, total })))) };
    await TestBed.configureTestingModule({
      imports: [RequestsComponent],
      providers: [provideRouter([]), { provide: RequestsService, useValue: service }],
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

  it('propose "Voir mes devis" en mobile (barre fixe) comme en desktop (en-tête), vers la page Mes devis', async () => {
    await create();

    const links = [...compiled.querySelectorAll('a[href="/producer/requests/quotes"]')];
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Voir mes devis', 'Voir mes devis']);
    // * un des deux est la barre mobile (masquée en desktop), l'autre l'en-tête
    // * desktop (masqué en mobile), mais aucun n'est le seul accès à la page
    expect(links.filter((a) => a.closest('header')).length).toBe(1);
    expect(links.filter((a) => !a.closest('header')).length).toBe(1);
  });

  it('affiche un message quand le back est injoignable', async () => {
    await create(throwError(() => new Error('API down')));

    expect(compiled.textContent).toContain('Impossible de charger les demandes');
  });

  // cahier fonctionnel : producteur non abonné = aperçu limité + bouton de déblocage
  it('sans abonnement : un message d\'aperçu limité avec le lien de déblocage, et le filtre Budget est désactivé', async () => {
    await create(of(REQUESTS.map((r) => ({ ...r, locked: true, budgetMax: null }))));

    expect(compiled.textContent).toContain('Aperçu limité');
    expect(compiled.querySelector('a[href="/producer/subscription"]')?.textContent?.trim()).toBe('Débloquer les demandes');
    expect((chip('Budget') as HTMLButtonElement).disabled).toBe(true);
    // les cartes montrent toujours produit, volume et zone
    expect(rows()[0]).toContain('Tomates bio - 20kg');
    expect(rows()[0]).toContain('Lyon · 4 km');
  });

  it('avec un abonnement : pas de message d\'aperçu, le filtre Budget fonctionne', async () => {
    await create();

    expect(compiled.textContent).not.toContain('Aperçu limité');
    expect(compiled.querySelector('a[href="/producer/subscription"]')).toBeNull();
    expect((chip('Budget') as HTMLButtonElement).disabled).toBe(false);
  });

  // en attendant les donnees : un squelette a la place d'une zone vide, qui s'efface quand elles arrivent
  it('montre un squelette en attendant les données, puis le contenu', async () => {
    const data = new Subject<typeof REQUESTS>();
    await create(data);
    const skeleton = () => compiled.querySelector('app-page-skeleton');
    expect(skeleton()).toBeTruthy();
    expect(skeleton()!.textContent).toContain('Chargement');

    data.next(REQUESTS);
    fixture.detectChanges();

    expect(skeleton()).toBeNull();
  });

  describe('pages', () => {
    const more = () => [...compiled.querySelectorAll('app-load-more button')].find((b) => b.textContent?.trim() === 'Voir plus') as HTMLElement | undefined;

    it('demande la première page, trente par trente', async () => {
      await create();

      expect(service.getAvailablePage).toHaveBeenCalledWith(1);
    });

    it('propose « Voir plus » quand il y a plus de demandes que chargées, pas sinon', async () => {
      await create(of(REQUESTS), 45);
      expect(more()).toBeDefined();
      expect(compiled.textContent).toContain('3 sur 45');

      TestBed.resetTestingModule();
      await create(of(REQUESTS), 3);
      expect(more()).toBeUndefined();
    });

    it('charge la page suivante et la met à la suite', async () => {
      await create(of(REQUESTS), 4);
      service.getAvailablePage.mockReturnValue(of({ items: [request({ product: 'Fraises' })], total: 4 }));

      more()!.click();
      fixture.detectChanges();

      expect(service.getAvailablePage).toHaveBeenLastCalledWith(2);
      expect(rows().length).toBe(4);
      expect(rows()[3]).toContain('Fraises');
      expect(more()).toBeUndefined();
    });

    it('prévient que les filtres ne portent que sur les demandes affichées tant qu\'il en reste à charger', async () => {
      await create(of(REQUESTS), 45);
      expect(compiled.textContent).not.toContain('Les filtres ne portent que');

      chip('Urgentes').click();
      fixture.detectChanges();

      expect(compiled.textContent).toContain('Les filtres ne portent que sur les demandes affichées.');
    });
  });
});
