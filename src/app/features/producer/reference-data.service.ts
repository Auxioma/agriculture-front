import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ttlCache } from '../../core/http/ttl-cache';
import { LabelInfo } from './labels/labels.service';
import { CatalogCategory, CatalogProduct, ProductUnit } from './products/products.service';

const CACHE_MS = 5 * 60 * 1000;

// les listes du catalogue (labels, unites, categories, produits) : les memes pour tout le monde, l'admin les change rarement.
// Plusieurs pages de l'espace les relisent a chaque visite (produits, profil, labels, reponse a une demande) : on les garde 5 min.
@Injectable({ providedIn: 'root' })
export class ReferenceDataService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  labels = ttlCache(CACHE_MS, () => this.http.get<LabelInfo[]>(`${this.apiUrl}/labels`));
  units = ttlCache(CACHE_MS, () => this.http.get<ProductUnit[]>(`${this.apiUrl}/units`));
  categories = ttlCache(CACHE_MS, () => this.http.get<CatalogCategory[]>(`${this.apiUrl}/categories`));
  products = ttlCache(CACHE_MS, () => this.http.get<CatalogProduct[]>(`${this.apiUrl}/products`));
}
