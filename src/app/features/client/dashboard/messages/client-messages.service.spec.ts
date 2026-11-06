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

  it('GET /client/conversations donne la liste du client', () => {
    TestBed.inject(ClientMessagesService).list().subscribe();

    expect(http.expectOne(`${environment.apiURL}/client/conversations`).request.method).toBe('GET');
  });
});
