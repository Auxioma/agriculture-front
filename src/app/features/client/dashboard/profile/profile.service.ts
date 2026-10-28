import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Address,
  AddressPayload,
  ChangePasswordPayload,
  Me,
  Preferences,
  PreferencesPatch,
} from './profile.model';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiURL;

  me(): Observable<Me> {
    return this.http.get<Me>(`${this.api}/me`);
  }

  preferences(): Observable<Preferences> {
    return this.http.get<Preferences>(`${this.api}/me/preferences`);
  }

  updatePreferences(patch: PreferencesPatch): Observable<Preferences> {
    return this.http.patch<Preferences>(`${this.api}/me/preferences`, patch);
  }

  addresses(): Observable<Address[]> {
    return this.http.get<Address[]>(`${this.api}/me/addresses`);
  }

  createAddress(payload: AddressPayload): Observable<Address> {
    return this.http.post<Address>(`${this.api}/me/addresses`, payload);
  }

  updateAddress(id: string, payload: AddressPayload): Observable<Address> {
    return this.http.put<Address>(`${this.api}/me/addresses/${id}`, payload);
  }

  deleteAddress(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/me/addresses/${id}`);
  }

  changePassword(payload: ChangePasswordPayload): Observable<void> {
    return this.http.put<void>(`${this.api}/me/password`, payload);
  }

  exportData(): Observable<unknown> {
    return this.http.get<unknown>(`${this.api}/me/export`);
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${this.api}/me`);
  }
}
