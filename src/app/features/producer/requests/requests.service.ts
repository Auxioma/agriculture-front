import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AvailableRequest } from '../dashboard/dashboard.model';

@Injectable({ providedIn: 'root' })
export class RequestsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getAvailable() {
    return this.http.get<AvailableRequest[]>(`${this.apiUrl}/producer/requests/available`);
  }
}
