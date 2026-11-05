import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClientDashboardService } from './dashboard.service';
import { DashboardSummary } from './dashboard.model';
import { environment } from '../../../../environments/environment';

describe('ClientDashboardService', () => {
  let service: ClientDashboardService;
  let httpMock: HttpTestingController;

  const summary: DashboardSummary = {
    activeRequests: 2,
    receivedReplies: 1,
    unreadMessages: 3,
    requests: [
      { id: 'r1', title: 'Pommes bio', sentAt: '2026-10-01T10:00:00Z', status: 'pending' },
    ],
    messages: [],
    favorites: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClientDashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Échoue si une requête inattendue est restée en attente
    httpMock.verify();
  });

  it('appelle GET /client/dashboard et retourne le résumé', () => {
    let result: DashboardSummary | undefined;
    service.getSummary().subscribe((s) => (result = s));

    const req = httpMock.expectOne(`${environment.apiURL}/client/dashboard`);
    expect(req.request.method).toBe('GET');

    req.flush(summary);
    expect(result).toEqual(summary);
  });

  it('propage l’erreur HTTP au subscriber', () => {
    let status: number | undefined;
    service.getSummary().subscribe({ error: (e) => (status = e.status) });

    httpMock
      .expectOne(`${environment.apiURL}/client/dashboard`)
      .flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
  });
});
