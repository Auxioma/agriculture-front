import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { shareReplay } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Category, Label, Product, Unit } from '../models/request.model';

/**
 * Lectures du catalogue utilisées par le tunnel.
 * Si tu as déjà un service pour les catégories, réutilise-le à la place de getCategories().
 * shareReplay(1) : une seule requête par session, même si on revient sur l'étape.
 */
@Injectable({ providedIn: 'root' })
export class FunnelCatalogService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiURL;

  private readonly categories$ = this.http
    .get<Category[]>(`${this.api}/categories`)
    .pipe(shareReplay(1));
  private readonly products$ = this.http
    .get<Product[]>(`${this.api}/products`)
    .pipe(shareReplay(1));
  private readonly labels$ = this.http.get<Label[]>(`${this.api}/labels`).pipe(shareReplay(1));
  private readonly units$ = this.http.get<Unit[]>(`${this.api}/units`).pipe(shareReplay(1));

  getCategories() {
    return this.categories$;
  }
  getProducts() {
    return this.products$;
  }
  getLabels() {
    return this.labels$;
  }
  getUnits() {
    return this.units$;
  }
}
