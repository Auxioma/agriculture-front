import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { NewReview, ReplyReview, ReplyStatus, RequestReplies } from './reply.model';

@Injectable({ providedIn: 'root' })
export class RepliesService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiURL;

  /** Ouvrir la liste marque les réponses comme vues côté back. */
  list(requestId: string): Observable<RequestReplies> {
    return this.http.get<RequestReplies>(`${this.api}/client/requests/${requestId}/replies`);
  }

  accept(replyId: string): Observable<{ id: string; status: ReplyStatus }> {
    return this.http.post<{ id: string; status: ReplyStatus }>(
      `${this.api}/client/replies/${replyId}/accept`,
      {},
    );
  }

  decline(replyId: string): Observable<{ id: string; status: ReplyStatus }> {
    return this.http.post<{ id: string; status: ReplyStatus }>(
      `${this.api}/client/replies/${replyId}/decline`,
      {},
    );
  }

  /** Un avis part toujours « en attente » : le back le fait modérer avant de le publier. */
  review(review: NewReview): Observable<{ id: string; status: ReplyReview['status'] }> {
    return this.http.post<{ id: string; status: ReplyReview['status'] }>(
      `${this.api}/reviews`,
      review,
    );
  }
}
