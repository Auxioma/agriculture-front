import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, afterRenderEffect, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, Subject, catchError, distinctUntilChanged, interval, map, merge, of, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { messageOf } from '../../message-of';
import { requestTitle } from '../../request-format';
import { CLIENT_TYPES, QUICK_REPLIES, REPORT_REASONS, clockTime, dayLabel, fileProblem } from '../messages-format';
import { MessagesStore } from '../messages-store';
import { MessagesService } from '../messages.service';
import { ThreadMessage } from '../messages.model';

// le fil ouvert relit le back de temps en temps (pas de temps reel pour l'instant) ; chaque lecture marque aussi
// comme lus les messages du client
const POLL_MS = 10_000;

// fil d'une conversation, branche sur GET /api/conversations/{id} puis, pour ecrire, joindre
// un fichier et signaler, sur les routes communes aux deux roles. Le nom du client, le type et la demande liée
// viennent de la liste (le fil ne les donne pas). "Bloquer cet utilisateur" de la maquette n'est pas fait : aucune
// route ne cree de blocage, voir NOTES.md ; "Signaler" prend sa place (cahier : actions rapides, signaler).
// "vu il y a 10 min" non plus : le back n'enregistre pas la derniere activite, voir NOTES.md.
@Component({
  selector: 'app-producer-thread',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './thread.component.html',
})
export class ThreadComponent {
  private service = inject(MessagesService);
  private store = inject(MessagesStore);
  private me = inject(AuthService).currentUser;
  private refresh = new Subject<void>();

  private id$ = inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? ''));

  readonly id = toSignal(this.id$, { initialValue: '' });
  readonly conversation = computed(() => this.store.find(this.id()));

  // undefined = chargement, null = erreur (conversation inconnue ou qui n'est pas la sienne...). Le fil repart de zero
  // quand on change de conversation, pas a chaque relecture.
  readonly thread = toSignal(
    this.id$.pipe(
      distinctUntilChanged(),
      switchMap((id) =>
        merge(interval(POLL_MS).pipe(startWith(0)), this.refresh).pipe(
          switchMap(() =>
            this.service.thread(id).pipe(
              tap(() => this.store.reload()),
              catchError(() => of(null)),
            ),
          ),
          startWith(undefined),
        ),
      ),
    ),
  );

  // une ligne par jour, avec son separateur
  readonly days = computed(() => {
    const groups: { label: string; messages: ThreadMessage[] }[] = [];
    for (const message of this.thread()?.messages ?? []) {
      const label = dayLabel(message.createdAt);
      const last = groups.at(-1);
      if (last?.label === label) last.messages.push(message);
      else groups.push({ label, messages: [message] });
    }
    return groups;
  });

  draft = signal('');
  sending = signal(false);
  error = signal('');
  menuOpen = signal(false);
  reporting = signal(false);
  reason = signal('');
  reportMessage = signal('');

  readonly quickReplies = QUICK_REPLIES;
  readonly reasons = REPORT_REASONS;
  private input = viewChild<ElementRef<HTMLInputElement>>('box');
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private count = computed(() => this.thread()?.messages.length ?? 0);

  constructor() {
    // en bas du fil au chargement et des qu'un message arrive
    afterRenderEffect(() => {
      this.count();
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  isMine(message: ThreadMessage): boolean {
    return message.senderId !== null && message.senderId === this.me()?.id;
  }

  readonly clientTypes = CLIENT_TYPES;
  readonly requestTitle = requestTitle;
  readonly clockTime = clockTime;

  // glisse une reponse rapide dans le champ : le producteur la relit, la complete ou la modifie avant d'envoyer
  quickReply(text: string): void {
    this.draft.update((draft) => (draft ? `${draft} ${text}` : text));
    this.input()?.nativeElement.focus();
  }

  send(): void {
    const content = this.draft().trim();
    if (!content || this.sending()) return;
    this.run(this.service.send(this.id(), content));
  }

  attach(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.sending()) return;

    const problem = fileProblem(file);
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.run(this.service.attach(this.id(), file, this.draft().trim()));
  }

  // apres l'envoi on relit le fil : il affiche le nouveau message avec son heure
  private run(call: Observable<unknown>): void {
    this.sending.set(true);
    this.error.set('');
    call.subscribe({
      next: () => {
        this.sending.set(false);
        this.draft.set('');
        this.refresh.next();
      },
      error: (err: HttpErrorResponse) => {
        this.sending.set(false);
        this.error.set(messageOf(err));
      },
    });
  }

  openReport(): void {
    this.menuOpen.set(false);
    this.reporting.set(true);
    this.error.set('');
  }

  // aucun motif n'est coche d'avance : un signalement par erreur coute du temps a la moderation
  report(): void {
    if (!this.reason()) {
      this.error.set('Choisissez un motif de signalement.');
      return;
    }

    this.sending.set(true);
    this.error.set('');
    this.service.report(this.id(), { reason: this.reason(), message: this.reportMessage().trim() || null }).subscribe({
      next: () => {
        this.sending.set(false);
        this.reporting.set(false);
        this.reason.set('');
        this.reportMessage.set('');
        this.refresh.next();
      },
      error: (err: HttpErrorResponse) => {
        this.sending.set(false);
        this.error.set(messageOf(err));
      },
    });
  }
}
