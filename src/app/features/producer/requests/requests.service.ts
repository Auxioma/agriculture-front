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

// page de detail d'une demande : la demande comme dans la liste, plus le besoin complet et son etat pour ce producteur
export interface RequestDetail extends AvailableRequest {
  desiredDate: string | null;
  department: string | null;
  pickupWanted: boolean;
  deliveryWanted: boolean;
  attachments: { fileName: string | null; fileUrl: string | null }[];
  status: 'new' | 'treated' | 'closed';
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

  getDetail(requestId: string) {
    return this.http.get<RequestDetail>(`${this.apiUrl}/producer/requests/${requestId}`);
  }
}
