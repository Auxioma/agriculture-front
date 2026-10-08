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

// brouillon de reponse (page "Repondre a la demande") : ce que le producteur avait deja saisi
export interface ReplyDraft {
  replyText: string | null;
  priceAmount: number | null;
  priceUnitId: string | null;
  availableQuantity: number | null;
  availabilityDate: string | null;
  validUntil: string | null;
  pickupConditions: string | null;
  deliveryConditions: string | null;
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
  draft: ReplyDraft | null;
}

export interface Unit {
  id: string;
  code: string;
  label: string | null;
}

// corps de POST /api/producer/requests/{id}/reply ; draft = "Enregistrer le brouillon"
export interface ReplyPayload {
  draft: boolean;
  replyText: string | null;
  priceAmount: string | null;
  priceUnitId: string | null;
  currencyCode: string | null;
  availableQuantity: string | null;
  availabilityDate: string | null;
  validUntil: string | null;
  pickupConditions: string | null;
  deliveryConditions: string | null;
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

  getUnits() {
    return this.http.get<Unit[]>(`${this.apiUrl}/units`);
  }

  sendReply(requestId: string, payload: ReplyPayload) {
    return this.http.post<{ id: string; status: string }>(`${this.apiUrl}/producer/requests/${requestId}/reply`, payload);
  }
}
