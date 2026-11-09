import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../../environments/environment';
import { ClientMessagesService } from './client-messages.service';

describe('ClientMessagesService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const url = `${environment.apiURL}/client/conversations`;

  it('GET /client/conversations donne la liste du client, cent par requête (le plafond du back)', () => {
    TestBed.inject(ClientMessagesService).list().subscribe();

    expect(http.expectOne(`${url}?pageSize=100`).request.method).toBe('GET');
  });

  it("va chercher la page suivante tant que le total annoncé n'est pas atteint", () => {
    let result: unknown[] = [];
    TestBed.inject(ClientMessagesService).list().subscribe((list) => (result = list));

    http.expectOne(`${url}?pageSize=100`).flush([{ id: 'c1' }], { headers: { 'X-Total-Count': '2' } });
    http.expectOne(`${url}?pageSize=100&page=2`).flush([{ id: 'c2' }], { headers: { 'X-Total-Count': '2' } });

    expect(result).toEqual([{ id: 'c1' }, { id: 'c2' }]);
  });
});
