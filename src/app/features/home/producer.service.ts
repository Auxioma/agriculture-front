import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ttlCache } from '../../core/http/ttl-cache';
import { FeaturedProducer } from './producer.model';

// les producteurs a la une changent rarement : revenir sur l'accueil ne les redemande pas pendant ce temps
const CACHE_MS = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class ProducerService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getFeatured = ttlCache(CACHE_MS, (limit: number = 3) =>
    this.http.get<FeaturedProducer[]>(`${this.apiUrl}/producers/featured`, { params: { limit } }),
  );
}
