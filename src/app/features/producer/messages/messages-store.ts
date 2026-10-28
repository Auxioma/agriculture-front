import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, interval, merge, of, startWith, switchMap } from 'rxjs';
import { MessagesService } from './messages.service';
import { ProducerConversation } from './messages.model';

// pas de temps reel cote back pour l'instant : on relit la liste de temps en temps. Le fil ouvert la relit aussi
// a chaque fois qu'il se rafraichit (voir ThreadComponent), donc ici c'est surtout pour la liste seule.
const POLL_MS = 30_000;

// la liste des conversations, partagee entre la liste (a gauche) et le fil ouvert (a droite). Fournie par
// MessagesComponent et non a la racine : elle repart de zero a chaque entree dans la messagerie (autre compte...).
@Injectable()
export class MessagesStore {
  private service = inject(MessagesService);
  private refresh = new Subject<void>();

  // undefined = chargement, null = erreur (back injoignable, compte sans profil producteur...)
  readonly conversations = signal<ProducerConversation[] | null | undefined>(undefined);

  constructor() {
    merge(interval(POLL_MS).pipe(startWith(0)), this.refresh)
      .pipe(
        switchMap(() => this.service.list().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      // une relecture qui echoue ne vide pas une liste deja affichee
      .subscribe((list) => this.conversations.update((old) => list ?? old ?? null));
  }

  find(id: string): ProducerConversation | undefined {
    return this.conversations()?.find((c) => c.id === id);
  }

  reload(): void {
    this.refresh.next();
  }
}
