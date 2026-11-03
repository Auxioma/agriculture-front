import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ttlCache } from '../../core/http/ttl-cache';
import { FaqArticle } from './faq.model';

// la FAQ change rarement : revenir sur l'accueil ne la redemande pas pendant ce temps
const CACHE_MS = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class FaqService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getAll = ttlCache(CACHE_MS, () => this.http.get<FaqArticle[]>(`${this.apiUrl}/faq`));
}
