import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Coordinates } from '../models/producer-summary.model';
import { features } from 'process';

interface AdressResponse {
  features: { geometry: { coordinates: [number, number] } }[];
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);

  locate(query: string): Observable<Coordinates | null> {
    return this.http
      .get<AdressResponse>('https://api-adresse.data.gouv.fr/search/', {
        params: { q: query, limit: 1 },
      })
      .pipe(
        map((res) => {
          const coordinates = res.features[0]?.geometry.coordinates;
          return coordinates ? { latitude: coordinates[1], longitude: coordinates[0] } : null;
        }),
      );
  }
}
