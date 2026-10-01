import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FeaturedProducer } from './producer.model';

@Injectable({ providedIn: 'root' })
export class ProducerService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getFeatured(limit = 3) {
    return this.http.get<FeaturedProducer[]>(`${this.apiUrl}/producers/featured`, {
      params: { limit },
    });
  }
}
