import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, interval, merge, of, startWith, switchMap } from 'rxjs';
import { ClientConversation } from './client-messages.model';
import { ClientMessagesService } from './client-messages.service';

// pas de temps reel cote back pour l'instant : on relit la liste de temps en temps
const POLL_MS = 30_000;

// la liste des conversations, partagee entre la liste (a gauche) et le fil ouvert (a droite). Fournie par ClientMessagesComponent
// et non a la racine : elle repart de zero a chaque entree dans la messagerie (autre compte...).
@Injectable()
export class ClientMessagesStore {
  private readonly service = inject(ClientMessagesService);
  private readonly refresh = new Subject<void>();

  // undefined = chargement, null = erreur
  readonly conversations = signal<ClientConversation[] | null | undefined>(undefined);

  constructor() {
    merge(interval(POLL_MS).pipe(startWith(0)), this.refresh)
      .pipe(
        switchMap(() => this.service.list().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      // une relecture qui echoue ne vide pas une liste deja affichee
      .subscribe((list) => this.conversations.update((old) => list ?? old ?? null));
  }

  find(id: string): ClientConversation | undefined {
    return this.conversations()?.find((c) => c.id === id);
  }

  reload(): void {
    this.refresh.next();
  }
}
