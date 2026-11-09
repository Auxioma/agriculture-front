import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const api = environment.apiURL;
  let service: NotificationsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotificationsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('annonce un changement a ceux qui l ecoutent (la cloche), sans appeler le back', () => {
    let announced = 0;
    service.changes$.subscribe(() => announced++);

    service.announceChange();
    service.announceChange();

    expect(announced).toBe(2);
  });

  it('lit les plus recentes avec la limite demandee', () => {
    let result: unknown;
    service.latest(20).subscribe((list) => (result = list));

    const req = http.expectOne((r) => r.method === 'GET' && r.url === `${api}/notifications`);
    expect(req.request.params.get('limit')).toBe('20');
    // * rien d'autre : ni unreadOnly, la cloche a besoin des lues aussi
    expect(req.request.params.keys()).toEqual(['limit']);
    const list = [{ id: 'n1', type: 'new_message', title: 'Nouveau message', body: null, readAt: null, createdAt: '2026-10-26T09:00:00+00:00' }];
    req.flush(list);

    expect(result).toEqual(list);
  });

  it("lit une page de l'historique avec son total", () => {
    let result: unknown;
    service.page(2, 20).subscribe((page) => (result = page));

    const req = http.expectOne((r) => r.method === 'GET' && r.url === `${api}/notifications`);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('20');
    const list = [{ id: 'n21', type: 'new_message', title: 'Titre', body: null, readAt: null, createdAt: '2026-10-26T09:00:00+00:00' }];
    req.flush(list, { headers: { 'X-Total-Count': '45' } });

    expect(result).toEqual({ items: list, total: 45 });
  });

  it('marque une notification lue', () => {
    service.markAsRead('n1').subscribe();

    http.expectOne((r) => r.method === 'POST' && r.url === `${api}/notifications/n1/read`).flush(null);
  });

  it('marque tout comme lu', () => {
    service.markAllAsRead().subscribe();

    http.expectOne((r) => r.method === 'POST' && r.url === `${api}/notifications/read-all`).flush(null);
  });
});
