import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(StatisticsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lit les statistiques du producteur connecté', () => {
    let result: unknown;
    service.get().subscribe((value) => (result = value));

    const call = http.expectOne(`${environment.apiURL}/producer/statistics`);
    expect(call.request.method).toBe('GET');
    call.flush({ profileViews: 248 });

    expect(result).toEqual({ profileViews: 248 });
  });
});
