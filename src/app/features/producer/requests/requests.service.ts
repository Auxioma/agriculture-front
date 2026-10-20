import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AvailableRequest } from '../dashboard/dashboard.model';

// new = a traiter, treated = reponse envoyee ou refus, archived = mise de cote par le producteur, closed = plus
// ouverte (expiree, annulee...)
export interface ReceivedRequest {
  requestId: string;
  clientName: string;
  product: string | null;
  quantity: number | null;
  unit: string | null;
  urgent: boolean;
  status: 'new' | 'treated' | 'archived' | 'closed';
  receivedAt: string;
  respondedAt: string | null;
  declined: boolean;
  // producteur sans abonnement : le nom du client est caché
  locked: boolean;
}

// piece jointe d'une reponse ; fileUrl est une URL signee qui expire (generee par le back a chaque lecture)
export interface ReplyFile {
  id: string;
  fileName: string | null;
  mimeType: string | null;
  fileUrl: string | null;
}

// brouillon de reponse (page "Repondre a la demande") : ce que le producteur avait deja saisi
export interface ReplyDraft {
  id: string;
  attachments: ReplyFile[];
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
  status: 'new' | 'treated' | 'archived' | 'closed';
  // signalee et pas encore tranchee par l'equipe : la demande n'est plus en circulation
  underReview: boolean;
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

// une ligne de la page "Mes devis" : une reponse du producteur, avec ou sans prix (message seul), brouillons compris.
// status : draft, sent, seen, accepted, declined, expired, archived ; les statuts vue a archivee sont poses cote
// client, voir NOTES.md
export interface Quote {
  replyId: string;
  requestId: string;
  clientName: string;
  product: string | null;
  quantity: number | null;
  unit: string | null;
  priceAmount: number | null;
  priceUnit: string | null;
  currency: string | null;
  status: string;
  sentAt: string;
  validUntil: string | null;
}

// page "Detail du devis" : le devis de la liste plus ses conditions, le message du producteur et les pieces jointes
export interface QuoteDetail extends Quote {
  clientType: 'individual' | 'professional';
  availableQuantity: number | null;
  availabilityDate: string | null;
  pickupConditions: string | null;
  deliveryConditions: string | null;
  replyText: string | null;
  attachments: { fileName: string | null; fileUrl: string | null }[];
  // date d'acceptation par le client : le back ne la fournit pas encore (aucun champ), voir NOTES.md
  decidedAt?: string | null;
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

  getQuotes() {
    return this.http.get<Quote[]>(`${this.apiUrl}/producer/quotes`);
  }

  getQuote(replyId: string) {
    return this.http.get<QuoteDetail>(`${this.apiUrl}/producer/quotes/${replyId}`);
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

  // refus poli : la demande passe dans les traitees
  declineRequest(requestId: string) {
    return this.http.post<{ id: string }>(`${this.apiUrl}/producer/requests/${requestId}/decline`, {});
  }

  // le producteur met la demande de cote (le client n'en sait rien)
  archiveRequest(requestId: string) {
    return this.http.post<{ status: string }>(`${this.apiUrl}/producer/requests/${requestId}/archive`, {});
  }

  archiveQuote(replyId: string) {
    return this.http.post<{ id: string; status: string }>(`${this.apiUrl}/producer/quotes/${replyId}/archive`, {});
  }

  // piece jointe d'un brouillon : le brouillon doit deja exister
  uploadReplyFile(replyId: string, file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<ReplyFile>(`${this.apiUrl}/producer/replies/${replyId}/attachments`, body);
  }

  removeReplyFile(replyId: string, fileId: string) {
    return this.http.delete<void>(`${this.apiUrl}/producer/replies/${replyId}/attachments/${fileId}`);
  }

  reportRequest(requestId: string, payload: { reason: string; message: string | null }) {
    return this.http.post<{ id: string }>(`${this.apiUrl}/producer/requests/${requestId}/report`, payload);
  }
}
