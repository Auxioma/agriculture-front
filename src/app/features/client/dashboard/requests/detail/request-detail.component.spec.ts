import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RepliesService } from './replies.service';
import { Reply, RequestReplies } from './reply.model';
import { RequestDetailComponent } from './request-detail.component';

const reply = (id: string, changes: Partial<Reply> = {}, name = `Ferme ${id}`): Reply => ({
  id,
  status: 'sent',
  sentAt: '2026-11-05T09:00:00+01:00',
  producer: { id: `p-${id}`, name, slug: `ferme-${id}`, city: 'Lyon', verified: false, distanceKm: null },
  message: null,
  priceAmount: null,
  priceUnit: null,
  currency: null,
  availableQuantity: null,
  quantityUnit: null,
  availabilityDate: null,
  validUntil: null,
  conditions: null,
  pickupConditions: null,
  deliveryConditions: null,
  conversationId: `c-${id}`,
  review: null,
  attachments: [],
  ...changes,
});

const data = (replies: Reply[], status: RequestReplies['request']['status'] = 'replies_received'): RequestReplies => ({
  request: { id: 'req-1', status, product: 'Tomates', quantity: 5, unit: 'kg', city: 'Lyon', desiredDate: '2026-11-20', sentAt: '2026-11-01T10:00:00+01:00' },
  replies,
});

describe('RequestDetailComponent', () => {
  let fixture: ComponentFixture<RequestDetailComponent>;
  const api = { list: vi.fn(), accept: vi.fn(), decline: vi.fn() };

  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent?.replace(/\s+/g, ' ');
  const names = () => [...root().querySelectorAll('app-reply-card h3')].map((h) => h.textContent?.trim());
  const button = (label: string, within: ParentNode = root()) =>
    [...within.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  const tab = (label: string) => button(label, root().querySelector('app-filter-tabs')!)!;

  function create(list$: Observable<RequestReplies>): void {
    api.list.mockReturnValue(list$);
    fixture = TestBed.createComponent(RequestDetailComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: RepliesService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'req-1' }) } } },
      ],
    });
  });

  it('lit les réponses de la demande ouverte, et attend la réponse en le disant', () => {
    create(NEVER);

    expect(api.list).toHaveBeenCalledWith('req-1');
    expect(text()).toContain('Chargement');
  });

  it('montre la demande (produit, quantité, statut, ville, dates) et ses réponses', () => {
    create(of(data([reply('a'), reply('b')])));

    expect(root().querySelector('h1')?.textContent).toContain('Tomates - 5 kg');
    expect(text()).toContain('Réponses reçues');
    expect(text()).toContain('Envoyée le 1 novembre');
    expect(text()).toContain('Lyon');
    expect(text()).toContain('Pour le 20 novembre');
    expect(text()).toContain('Réponses des producteurs (2)');
    expect(names().sort()).toEqual(['Ferme a', 'Ferme b']);
  });

  it("dit qu'aucun producteur n'a répondu quand il n'y a pas de réponse, sans onglets de tri", () => {
    create(of(data([], 'sent')));

    expect(text()).toContain("Aucun producteur n'a encore répondu");
    expect(root().querySelector('app-filter-tabs')).toBeNull();
  });

  it('classe les réponses par date, par prix croissant ou par distance, celles sans prix ni position en dernier', () => {
    create(
      of(
        data([
          reply('old', { sentAt: '2026-11-02T09:00:00+01:00', priceAmount: 9 }, 'Ancienne'),
          reply('cheap', { sentAt: '2026-11-04T09:00:00+01:00', priceAmount: 4, producer: { ...reply('x').producer, id: 'p2', slug: 's2', name: 'Pas chère', distanceKm: 30 } }, 'Pas chère'),
          reply('none', { sentAt: '2026-11-05T09:00:00+01:00' }, 'Sans prix'),
          reply('near', { sentAt: '2026-11-03T09:00:00+01:00', priceAmount: 7, producer: { ...reply('y').producer, id: 'p3', slug: 's3', name: 'Proche', distanceKm: 2 } }),
        ]),
      ),
    );

    expect(names()).toEqual(['Sans prix', 'Pas chère', 'Proche', 'Ancienne']);

    tab('Prix croissant').click();
    fixture.detectChanges();
    expect(names()).toEqual(['Pas chère', 'Proche', 'Ancienne', 'Sans prix']);

    tab('Plus proches').click();
    fixture.detectChanges();
    expect(names().slice(0, 2)).toEqual(['Proche', 'Pas chère']);
  });

  it('accepter une réponse la passe à acceptée sans recharger la page', () => {
    api.accept.mockReturnValue(of({ id: 'a', status: 'accepted' }));
    create(of(data([reply('a')])));

    button('Accepter')!.click();
    fixture.detectChanges();

    expect(api.accept).toHaveBeenCalledWith('a');
    expect(text()).toContain('Acceptée');
    expect(button('Accepter')).toBeUndefined();
  });

  it('refuser une réponse la passe à refusée', () => {
    api.decline.mockReturnValue(of({ id: 'a', status: 'declined' }));
    create(of(data([reply('a')])));

    button('Refuser')!.click();
    fixture.detectChanges();

    expect(api.decline).toHaveBeenCalledWith('a');
    expect(text()).toContain('Refusée');
  });

  it('garde la réponse telle quelle et dit pourquoi quand le back refuse la décision', () => {
    api.accept.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { error: "Cette demande n'est plus ouverte." } })),
    );
    create(of(data([reply('a')])));

    button('Accepter')!.click();
    fixture.detectChanges();

    expect(root().querySelector('[role=alert]')?.textContent).toContain("n'est plus ouverte");
    expect(button('Accepter')).toBeTruthy();
  });

  it("ne laisse plus choisir une réponse quand la demande n'est plus ouverte", () => {
    create(of(data([reply('a')], 'archived')));

    expect(button('Accepter')).toBeUndefined();
    expect(text()).toContain('Archivée');
  });

  it("dit que la demande est introuvable quand elle n'est pas la sienne", () => {
    create(throwError(() => new HttpErrorResponse({ status: 404, error: { error: 'Demande introuvable.' } })));

    expect(root().querySelector('[role=alert]')?.textContent).toContain('introuvable');
  });

  it('prévient quand le chargement échoue autrement', () => {
    create(throwError(() => new HttpErrorResponse({ status: 500 })));

    expect(root().querySelector('[role=alert]')?.textContent).toContain('Impossible de charger');
  });

  it('un lien ramène à la liste des demandes', () => {
    create(of(data([])));

    expect(root().querySelector('a[href="/client/requests"]')).toBeTruthy();
  });
});
