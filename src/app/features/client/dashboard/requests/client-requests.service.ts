import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ClientRequestItem } from './client-request.model';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClientRequestsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiURL}/client/requests`;

  list(): Observable<ClientRequestItem[]> {
    return this.http.get<ClientRequestItem[]>(this.baseUrl);
  }
  cancel(id: string) {
    return this.http.post<void>(`${this.baseUrl}/${id}/cancel`, {});
  }
  archive(id: string) {
    return this.http.post<void>(`${this.baseUrl}/${id}/archive`, {});
  }
  duplicate(id: string) {
    return this.http.post<{ id: string }>(`${this.baseUrl}/${id}/duplicate`, {});
  }
}
