import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  const api = environment.apiURL;
  let service: MessagesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(MessagesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lit la liste sur la route du producteur', () => {
    let rows: unknown;
    service.list().subscribe((value) => (rows = value));

    http.expectOne(`${api}/producer/conversations`).flush([{ id: 'c1' }]);

    expect(rows).toEqual([{ id: 'c1' }]);
  });

  it('lit un fil sur la route commune aux deux rôles', () => {
    service.thread('c1').subscribe();

    expect(http.expectOne(`${api}/conversations/c1`).request.method).toBe('GET');
  });

  it('envoie le texte du message', () => {
    service.send('c1', 'Bonjour').subscribe();

    const call = http.expectOne(`${api}/conversations/c1/messages`);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({ content: 'Bonjour' });
  });

  it('joint un fichier en multipart, avec le texte en légende quand il y en a un', () => {
    const file = new File(['pdf'], 'devis.pdf', { type: 'application/pdf' });
    service.attach('c1', file, 'Voici le devis').subscribe();

    const call = http.expectOne(`${api}/conversations/c1/attachments`);
    const body = call.request.body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('content')).toBe('Voici le devis');
  });

  it("n'envoie pas de légende vide avec le fichier", () => {
    service.attach('c1', new File(['pdf'], 'devis.pdf', { type: 'application/pdf' }), '').subscribe();

    const body = http.expectOne(`${api}/conversations/c1/attachments`).request.body as FormData;
    expect(body.has('content')).toBe(false);
  });

  it('signale une conversation avec un motif et un message facultatif', () => {
    service.report('c1', { reason: 'fraud', message: null }).subscribe();

    const call = http.expectOne(`${api}/conversations/c1/report`);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({ reason: 'fraud', message: null });
  });
});
