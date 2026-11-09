import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ClientRequestsService } from './client-requests.service';
import { ClientRequestItem } from './client-request.model';
import { environment } from '../../../../../environments/environment';

describe('ClientRequestsService', () => {
  const url = `${environment.apiURL}/client/requests`;
  let service: ClientRequestsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClientRequestsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list() fait un GET et renvoie les demandes', () => {
    const data: ClientRequestItem[] = [
      { id: '1', title: 'Tomates bio - 5kg', status: 'sent', sentAt: '2026-08-12T12:00:00Z' },
    ];
    let result: ClientRequestItem[] | undefined;

    service.list().subscribe((r) => (result = r));

    const req = http.expectOne(`${url}?pageSize=100`);
    expect(req.request.method).toBe('GET');
    req.flush(data);

    expect(result).toEqual(data);
  });

  it("list() va chercher la page suivante tant que le total annoncé n'est pas atteint", () => {
    const first: ClientRequestItem = { id: '1', title: 'Tomates', status: 'sent', sentAt: '2026-08-12T12:00:00Z' };
    const second: ClientRequestItem = { id: '2', title: 'Miel', status: 'sent', sentAt: '2026-08-13T12:00:00Z' };
    let result: ClientRequestItem[] | undefined;

    service.list().subscribe((r) => (result = r));

    http.expectOne(`${url}?pageSize=100`).flush([first], { headers: { 'X-Total-Count': '2' } });
    http.expectOne(`${url}?pageSize=100&page=2`).flush([second], { headers: { 'X-Total-Count': '2' } });

    expect(result).toEqual([first, second]);
  });

  it('cancel() fait un POST sur /{id}/cancel', () => {
    service.cancel('abc').subscribe();
    const req = http.expectOne(`${url}/abc/cancel`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('archive() fait un POST sur /{id}/archive', () => {
    service.archive('abc').subscribe();
    const req = http.expectOne(`${url}/abc/archive`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it("duplicate() fait un POST et renvoie l'id de la copie", () => {
    let result: { id: string } | undefined;
    service.duplicate('abc').subscribe((r) => (result = r));

    const req = http.expectOne(`${url}/abc/duplicate`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'new-id' });

    expect(result).toEqual({ id: 'new-id' });
  });

  it("propage l'erreur HTTP à l'appelant", () => {
    let status: number | undefined;
    service.list().subscribe({ error: (e) => (status = e.status) });

    http.expectOne(`${url}?pageSize=100`).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
  });
});
