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

  it('marque une notification lue', () => {
    service.markAsRead('n1').subscribe();

    http.expectOne((r) => r.method === 'POST' && r.url === `${api}/notifications/n1/read`).flush(null);
  });

  it('marque tout comme lu', () => {
    service.markAllAsRead().subscribe();

    http.expectOne((r) => r.method === 'POST' && r.url === `${api}/notifications/read-all`).flush(null);
  });
});
