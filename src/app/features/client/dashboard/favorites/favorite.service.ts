import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Favorite, FavoriteType } from './favorite.model';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiURL}/favorites`;

  private readonly _favorites = signal<Favorite[]>([]);
  readonly favorites = this._favorites.asReadonly(); // lecture seule pour les composants
  private loaded = false;

  /** Charge la liste une seule fois (évite un appel API par bouton affiché) */
  ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.load().subscribe({ error: () => (this.loaded = false) });
  }

  load(): Observable<Favorite[]> {
    return this.http.get<Favorite[]>(this.url).pipe(tap((list) => this._favorites.set(list)));
  }

  add(targetType: FavoriteType, targetId: string): Observable<{ id: string }> {
    return this.http
      .post<{ id: string }>(this.url, { targetType, targetId })
      .pipe(
        tap(({ id }) =>
          this._favorites.update((list) => [
            { id, targetType, targetId, createdAt: new Date().toISOString(), target: null },
            ...list,
          ]),
        ),
      );
  }

  remove(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.url}/${id}`)
      .pipe(tap(() => this._favorites.update((list) => list.filter((f) => f.id !== id))));
  }

  /** À appeler à la déconnexion : sinon l'utilisateur suivant verrait les favoris du précédent */
  clear(): void {
    this._favorites.set([]);
    this.loaded = false;
  }
}
