import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OpeningHour } from '../../catalog/models/producer-detail.model';
import { CatalogLabel } from '../products/products.service';

// GET /api/producer/profile : retrait et livraison valent null tant que le producteur n'a rien configure ;
// photoUrl est la couverture (la 1re photo publique)
export interface ProfileInfo {
  farmName: string;
  description: string | null;
  story: string | null;
  city: string | null;
  postalCode: string | null;
  addressVisibility: string | null;
  verificationStatus: string;
  pickupAvailable: boolean | null;
  deliveryAvailable: boolean | null;
  photoUrl: string | null;
}

// GET /api/producer/labels : verifiedAt vide = revendique mais pas encore valide par l'admin
export interface ProfileLabel {
  labelId: string;
  name: string;
  verifiedAt: string | null;
  expiresAt: string | null;
}

// GET /api/producer/delivery-zones : radiusKm est un decimal Doctrine, donc une chaine ("20.00")
export interface ProfileZone {
  id: string;
  radiusKm: string | null;
  rules: Record<string, unknown> | null;
}

// un creneau d'ouverture, 1 = lundi ... 7 = dimanche
export interface HourSlot {
  weekday: number;
  opensAt: string;
  closesAt: string;
}

export interface Exploitation {
  profile: ProfileInfo;
  labels: ProfileLabel[];
  zones: ProfileZone[];
  openingHours: OpeningHour[];
}

//! PUT remet a vide ce qui manque (description, ville...) --> on renvoie tous les champs, meme ceux que le formulaire
// ne montre pas (histoire, code postal). latitude et longitude : seulement quand la ville a change, sinon la position reste.
export interface ProfilePayload {
  farmName: string;
  description: string | null;
  story: string | null;
  city: string | null;
  postalCode: string | null;
  addressVisibility: string | null;
  latitude?: number;
  longitude?: number;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  // les 4 lectures partent ensemble, la page n'a pas d'autre appel
  getExploitation() {
    return forkJoin({
      profile: this.http.get<ProfileInfo>(`${this.apiUrl}/producer/profile`),
      labels: this.http.get<ProfileLabel[]>(`${this.apiUrl}/producer/labels`),
      zones: this.http.get<ProfileZone[]>(`${this.apiUrl}/producer/delivery-zones`),
      openingHours: this.http.get<OpeningHour[]>(`${this.apiUrl}/producer/opening-hours`),
    });
  }

  // GET /api/labels : tous les labels proposes (la liste a cocher)
  getCatalogLabels() {
    return this.http.get<CatalogLabel[]>(`${this.apiUrl}/labels`);
  }

  saveProfile(payload: ProfilePayload) {
    return this.http.put<null>(`${this.apiUrl}/producer/profile`, payload);
  }

  // la couverture remplace l'ancienne (le back retire l'ancienne ligne et son fichier)
  uploadCover(file: File) {
    const body = new FormData();
    body.append('photo', file);
    body.append('type', 'cover');

    return this.http.post<{ id: string; url: string }>(`${this.apiUrl}/producer/photos`, body);
  }

  // met les labels revendiques au meme etat que la liste cochee. On relit ce qui est revendique juste avant d'ecrire : une
  // sauvegarde interrompue puis relancee ne redemande pas ce qui est deja fait, et un label deja valide qu'on garde n'est pas touche.
  syncLabels(wanted: string[]): Observable<unknown> {
    return this.http.get<ProfileLabel[]>(`${this.apiUrl}/producer/labels`).pipe(
      switchMap((claimed) => {
        const have = claimed.map((label) => label.labelId);
        const calls = [
          ...wanted.filter((id) => !have.includes(id)).map((labelId) => this.http.post(`${this.apiUrl}/producer/labels`, { labelId })),
          ...have.filter((id) => !wanted.includes(id)).map((id) => this.http.delete(`${this.apiUrl}/producer/labels/${id}`)),
        ];

        return calls.length > 0 ? forkJoin(calls) : of(null);
      }),
    );
  }

  // la zone de vente est la plus grande des zones de livraison : les autres (avec leurs frais) ne bougent pas. Vide = on la supprime.
  syncRadius(km: number | null): Observable<unknown> {
    return this.http.get<ProfileZone[]>(`${this.apiUrl}/producer/delivery-zones`).pipe(
      switchMap((zones): Observable<unknown> => {
        const widest = zones.reduce<ProfileZone | null>((a, zone) => (a === null || Number(zone.radiusKm) > Number(a.radiusKm) ? zone : a), null);
        if (widest === null) {
          return km === null ? of(null) : this.http.post(`${this.apiUrl}/producer/delivery-zones`, { radiusKm: km });
        }
        if (km === null) return this.http.delete(`${this.apiUrl}/producer/delivery-zones/${widest.id}`);
        if (Number(widest.radiusKm) === km) return of(null);

        // PUT remet les frais a vide s'ils manquent : on les renvoie tels quels
        return this.http.put(`${this.apiUrl}/producer/delivery-zones/${widest.id}`, { radiusKm: km, rules: widest.rules });
      }),
    );
  }

  // la semaine entiere remplace l'ancienne (un jour sans creneau est ferme)
  saveHours(hours: HourSlot[]) {
    return this.http.put<unknown>(`${this.apiUrl}/producer/opening-hours`, { hours });
  }
}
