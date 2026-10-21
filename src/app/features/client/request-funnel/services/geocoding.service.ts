import { HttpBackend, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { AddressSuggestion } from '../models/request.model';

// API de géocodage de la Géoplateforme (ex-API Adresse). Vérifie l'URL dans leur documentation.
const GEOCODE_URL = 'https://data.geopf.fr/geocodage/search';

interface GeocodeResponse {
  features: {
    geometry: { coordinates: [number, number] }; // [longitude, latitude]
    properties: { label: string; city?: string; name?: string; postcode?: string };
  }[];
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  // HttpBackend = client SANS interceptors : le token JWT (ajouté par ton interceptor d'auth)
  // n'est ainsi jamais envoyé à un site tiers.
  private readonly http = new HttpClient(inject(HttpBackend));

  search(query: string): Observable<AddressSuggestion[]> {
    const params = new HttpParams().set('q', query).set('limit', '5').set('autocomplete', '1');

    return this.http.get<GeocodeResponse>(GEOCODE_URL, { params }).pipe(
      map((res) =>
        res.features
          .map((f) => ({
            label: f.properties.label,
            city: f.properties.city ?? f.properties.name ?? '',
            postalCode: f.properties.postcode ?? null,
            longitude: f.geometry.coordinates[0],
            latitude: f.geometry.coordinates[1],
          }))
          .filter((s) => s.city !== ''),
      ),
      catchError(() => of([])), // service indisponible : liste vide, pas de plantage
    );
  }
}
