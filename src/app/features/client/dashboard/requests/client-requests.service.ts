import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ClientRequestItem } from './client-request.model';
import { environment } from '../../../../../environments/environment';
import { getAllPages } from '../../../../core/http/paged';

// cent par requete, le plafond du back : ces listes sont paginees (vingt par defaut), l'ecran les veut entieres pour filtrer ou chercher
const PAGE_SIZE = 100;

@Injectable({ providedIn: 'root' })
export class ClientRequestsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiURL}/client/requests`;

  list(): Observable<ClientRequestItem[]> {
    return getAllPages<ClientRequestItem>(this.http, this.baseUrl, { pageSize: PAGE_SIZE });
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
