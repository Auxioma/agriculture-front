import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AvailableRequest } from '../dashboard/dashboard.model';

// new = a traiter, treated = reponse envoyee ou refus, closed = plus ouverte (expiree, annulee...)
export interface ReceivedRequest {
  requestId: string;
  clientName: string;
  product: string | null;
  quantity: number | null;
  unit: string | null;
  urgent: boolean;
  status: 'new' | 'treated' | 'closed';
  receivedAt: string;
  respondedAt: string | null;
  declined: boolean;
}

@Injectable({ providedIn: 'root' })
export class RequestsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getAvailable() {
    return this.http.get<AvailableRequest[]>(`${this.apiUrl}/producer/requests/available`);
  }

  getReceived() {
    return this.http.get<ReceivedRequest[]>(`${this.apiUrl}/producer/requests/received`);
  }
}
