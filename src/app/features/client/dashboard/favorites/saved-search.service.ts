import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { SavedSearch, SavedSearchCriteria } from './saved-search.model';
import { getAllPages } from '../../../../core/http/paged';

/**
 * Recherches sauvegardées (GET/POST /api/saved-searches, DELETE /api/saved-searches/{id}).
 * Sans état : la liste n'est lue que par la page Mes favoris, qui la garde pour elle (rien ne reste
 * en mémoire d'un utilisateur à l'autre).
 */
@Injectable({ providedIn: 'root' })
export class SavedSearchService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiURL}/saved-searches`;

  list(): Observable<SavedSearch[]> {
    return getAllPages<SavedSearch>(this.http, this.url);
  }

  create(name: string, criteria: SavedSearchCriteria): Observable<SavedSearch> {
    return this.http.post<SavedSearch>(this.url, { name, criteria });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
