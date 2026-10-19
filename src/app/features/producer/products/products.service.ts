import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface ProductUnit {
  id: string;
  code: string;
  label: string;
}

// la periode que le producteur donne a son produit : mois de debut et de fin, volume et unite (un "creneau" cote back)
export interface ProductAvailability {
  startMonth: number | null;
  endMonth: number | null;
  quantity: string | null;
  unit: ProductUnit | null;
}

export interface ProductLabel {
  id: string;
  name: string;
}

export interface ProductPhoto {
  id: string;
  url: string;
}

// un produit du catalogue du producteur (GET /api/producer/products). La saison et l'unite par defaut viennent du produit
// du catalogue (reglees dans l'admin) ; availability, labels et photos sont ceux du producteur pour ce produit.
// Volume et prix sont des decimaux en texte ("90.000").
export interface ProducerProduct {
  id: string;
  productId: string;
  name: string;
  variety: string | null;
  description: string | null;
  estimatedVolume: string | null;
  defaultPrice: string | null;
  currencyCode: string | null;
  isActive: boolean;
  unit: ProductUnit | null;
  seasonStartMonth: number | null;
  seasonEndMonth: number | null;
  availability: ProductAvailability | null;
  labels: ProductLabel[];
  photos: ProductPhoto[];
}

// produit du catalogue general (GET /api/products), pour en ajouter un
export interface CatalogProduct {
  id: string;
  name: string;
  categoryId: string;
  unit: ProductUnit | null;
}

export interface CatalogCategory {
  id: string;
  name: string;
}

// GET /api/labels
export interface CatalogLabel {
  id: string;
  name: string;
}

export interface AvailabilityPayload {
  startMonth: number | null;
  endMonth: number | null;
  quantity: string | null;
  unitId: string | null;
}

// PUT remplace les champs du produit : un champ absent est remis a vide cote back. On renvoie donc toujours tous les champs
// (voir payloadOf). Seuls labelIds et availability font exception : absents = inchanges, c'est ce qui permet a l'interrupteur
// de la liste de ne changer que isActive. availability a null partout = supprimer la periode.
export interface ProductPayload {
  variety: string | null;
  description: string | null;
  estimatedVolume: string | null;
  defaultPrice: string | null;
  currencyCode: string | null;
  isActive: boolean;
  labelIds?: string[];
  availability?: AvailabilityPayload;
}

export const payloadOf = (product: ProducerProduct, changes: Partial<ProductPayload> = {}): ProductPayload => ({
  variety: product.variety,
  description: product.description,
  estimatedVolume: product.estimatedVolume,
  defaultPrice: product.defaultPrice,
  currencyCode: product.currencyCode,
  isActive: product.isActive,
  ...changes,
});

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getProducts() {
    return this.http.get<ProducerProduct[]>(`${this.apiUrl}/producer/products`);
  }

  getCatalog() {
    return this.http.get<CatalogProduct[]>(`${this.apiUrl}/products`);
  }

  getCategories() {
    return this.http.get<CatalogCategory[]>(`${this.apiUrl}/categories`);
  }

  getUnits() {
    return this.http.get<ProductUnit[]>(`${this.apiUrl}/units`);
  }

  getLabels() {
    return this.http.get<CatalogLabel[]>(`${this.apiUrl}/labels`);
  }

  create(productId: string, payload: ProductPayload) {
    return this.http.post<{ id: string }>(`${this.apiUrl}/producer/products`, { productId, ...payload });
  }

  update(id: string, payload: ProductPayload) {
    return this.http.put<null>(`${this.apiUrl}/producer/products/${id}`, payload);
  }

  remove(id: string) {
    return this.http.delete<null>(`${this.apiUrl}/producer/products/${id}`);
  }

  // une photo s'envoie apres l'enregistrement du produit (il faut son identifiant) : jpeg, png ou webp, 5 Mo, 5 par produit
  uploadPhoto(productId: string, file: File) {
    const body = new FormData();
    body.append('photo', file);
    return this.http.post<ProductPhoto>(`${this.apiUrl}/producer/products/${productId}/photos`, body);
  }

  deletePhoto(productId: string, photoId: string) {
    return this.http.delete<null>(`${this.apiUrl}/producer/products/${productId}/photos/${photoId}`);
  }
}
