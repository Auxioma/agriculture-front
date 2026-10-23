import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Favorite, FavoriteType } from './favorite.model';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiURL}/favorites`;

  list(): Observable<Favorite[]> {
    return this.http.get<Favorite[]>(this.url);
  }

  add(targetType: FavoriteType, targetId: string): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.url, { targetType, targetId });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
