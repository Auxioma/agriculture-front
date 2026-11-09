import { Injectable, inject } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { hasProducerRole } from './producer-role';

// apres chaque navigation, un producteur connecte charge d'avance, en arriere-plan, les pages de son espace marquees
// `data: { preload: true }` (celles qu'il ouvre le plus) : passer de l'une a l'autre ne telecharge plus rien.
// Les autres visiteurs ne telechargent rien de plus. Le router rappelle la strategie a chaque navigation pour les routes pas encore
// chargees : un producteur dont /me n'a pas encore repondu au premier affichage est servi a la navigation suivante.
@Injectable({ providedIn: 'root' })
export class ProducerPreloading implements PreloadingStrategy {
  private user = inject(AuthService).currentUser;

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const user = this.user();
    return route.data?.['preload'] && user && hasProducerRole(user.roles) ? load() : of(null);
  }
}
