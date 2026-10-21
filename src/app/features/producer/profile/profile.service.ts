import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OpeningHour } from '../../catalog/models/producer-detail.model';

// GET /api/producer/profile : retrait et livraison valent null tant que le producteur n'a rien configure
export interface ProfileInfo {
  farmName: string;
  description: string | null;
  verificationStatus: string;
  pickupAvailable: boolean | null;
  deliveryAvailable: boolean | null;
}

// GET /api/producer/labels : verifiedAt vide = revendique mais pas encore valide par l'admin
export interface ProfileLabel {
  name: string;
  verifiedAt: string | null;
  expiresAt: string | null;
}

// GET /api/producer/delivery-zones : radiusKm est un decimal Doctrine, donc une chaine ("20.00")
export interface ProfileZone {
  radiusKm: string | null;
}

export interface Exploitation {
  profile: ProfileInfo;
  labels: ProfileLabel[];
  zones: ProfileZone[];
  openingHours: OpeningHour[];
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
}
