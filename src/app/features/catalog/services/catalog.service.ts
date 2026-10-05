import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Category } from '../models/category.model';
import { Product } from '../models/product.model';
import { Label } from '../models/producer-summary.model';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiURL;

  getCategories(locale?: string) {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`, {
      params: locale ? { locale } : {},
    });
  }

  getProducts(locale?: string) {
    return this.http.get<Product[]>(`${this.apiUrl}/products`, {
      params: locale ? { locale } : {},
    });
  }

  getLabels(locale?: string) {
    return this.http.get<Label[]>(`${this.apiUrl}/labels`, {
      params: locale ? { locale } : {},
    });
  }
}
