import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ProfileZone } from '../profile/profile.service';

// corps de POST et PUT /api/producer/delivery-zones : le rayon et les conditions (frais, minimum...). Un PUT remplace les
// conditions : pour une zone qui existe deja on renvoie celles qu'elle avait, ce qu'on ne modifie pas ne doit pas disparaitre
export interface ZonePayload {
  radiusKm: number;
  rules: Record<string, unknown> | null;
}

// les zones sont les memes que celles du profil (ProfileZone) : id, rayon en chaine ("20.00") et conditions
@Injectable({ providedIn: 'root' })
export class ZonesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  list() {
    return this.http.get<ProfileZone[]>(`${this.apiUrl}/producer/delivery-zones`);
  }

  create(payload: ZonePayload) {
    return this.http.post<ProfileZone>(`${this.apiUrl}/producer/delivery-zones`, payload);
  }

  update(id: string, payload: ZonePayload) {
    return this.http.put<ProfileZone>(`${this.apiUrl}/producer/delivery-zones/${id}`, payload);
  }

  remove(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/producer/delivery-zones/${id}`);
  }
}
