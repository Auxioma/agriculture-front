import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, concat, forkJoin, of, switchMap, toArray } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProfileInfo } from '../profile/profile.service';

// GET /api/labels : tous les labels proposes (le texte vient de l'admin)
export interface LabelInfo {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export type DocumentStatus = 'pending' | 'approved' | 'rejected';

// GET /api/producer/labels : un label declare par le producteur. verifiedAt est pose par l'admin quand il approuve le justificatif ;
// documentStatus est celui du justificatif rattache (null = aucun).
export interface ClaimedLabel {
  labelId: string;
  code: string;
  name: string;
  verifiedAt: string | null;
  expiresAt: string | null;
  documentId: string | null;
  documentStatus: DocumentStatus | null;
}

export interface LabelsPage {
  profile: Pick<ProfileInfo, 'verificationStatus' | 'verifiedAt'>;
  catalog: LabelInfo[];
  claimed: ClaimedLabel[];
}

// ce que le producteur a decide pour un label : declare ou non, et un justificatif a envoyer (choisi mais pas encore parti)
export interface LabelDraft {
  label: LabelInfo;
  on: boolean;
  file: File | null;
}

@Injectable({ providedIn: 'root' })
export class LabelsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getPage() {
    return forkJoin({
      profile: this.http.get<ProfileInfo>(`${this.apiUrl}/producer/profile`),
      catalog: this.http.get<LabelInfo[]>(`${this.apiUrl}/labels`),
      claimed: this.http.get<ClaimedLabel[]>(`${this.apiUrl}/producer/labels`),
    });
  }

  // met les declarations au meme etat que les choix du producteur, un label apres l'autre. On relit ce qui est declare juste avant
  // d'ecrire : une sauvegarde interrompue puis relancee ne redemande pas ce qui est deja fait. Declarer = (envoyer le justificatif,
  // puis) declarer ; deja declare avec un nouveau justificatif = le rattacher ; decocher = retirer.
  save(drafts: LabelDraft[]): Observable<unknown> {
    return this.http.get<ClaimedLabel[]>(`${this.apiUrl}/producer/labels`).pipe(
      switchMap((claimed) => {
        const have = new Map(claimed.map((label) => [label.labelId, label]));
        const steps = drafts.flatMap((draft) => this.stepsFor(draft, have.has(draft.label.id)));

        return steps.length > 0 ? concat(...steps).pipe(toArray()) : of([]);
      }),
    );
  }

  private stepsFor(draft: LabelDraft, alreadyClaimed: boolean): Observable<unknown>[] {
    const labelId = draft.label.id;
    if (!draft.on) {
      return alreadyClaimed ? [this.http.delete(`${this.apiUrl}/producer/labels/${labelId}`)] : [];
    }
    if (!alreadyClaimed) {
      const documentId$: Observable<string | null> = draft.file ? this.upload(draft.file, draft.label.code) : of(null);

      return [
        documentId$.pipe(
          switchMap((documentId) => this.http.post(`${this.apiUrl}/producer/labels`, documentId ? { labelId, documentId } : { labelId })),
        ),
      ];
    }

    return draft.file
      ? [this.upload(draft.file, draft.label.code).pipe(switchMap((documentId) => this.http.put(`${this.apiUrl}/producer/labels/${labelId}`, { documentId })))]
      : [];
  }

  // le type du justificatif est le code du label : l'admin voit de quelle certification il s'agit
  private upload(file: File, type: string): Observable<string> {
    const body = new FormData();
    body.append('file', file);
    body.append('type', type);

    return this.http
      .post<{ id: string }>(`${this.apiUrl}/producer/verification-documents`, body)
      .pipe(switchMap((document) => of(document.id)));
  }
}
