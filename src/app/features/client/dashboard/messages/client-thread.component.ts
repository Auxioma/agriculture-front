import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  distinctUntilChanged,
  interval,
  map,
  merge,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { messageOf } from '../../../producer/message-of';
import { clockTime, dayLabel, fileProblem } from '../../../producer/messages/messages-format';
import { MessagesService } from '../../../producer/messages/messages.service';
import { ThreadMessage } from '../../../producer/messages/messages.model';
import { CLIENT_REPORT_REASONS, conversationTitle } from './client-messages-format';
import { ClientMessagesStore } from './client-messages-store';

// le fil ouvert relit le back de temps en temps (pas de temps reel pour l'instant) ; chaque lecture marque aussi comme lus
// les messages du producteur
const POLL_MS = 10_000;

// fil d'une conversation du client (semblable au figma, comme celui du producteur) : GET /api/conversations/{id} puis, pour ecrire,
// joindre un fichier et signaler, les routes communes aux deux roles. Le nom du producteur et la demande liee viennent de la liste
// (le fil ne les donne pas). Ecarts avec la maquette : "Bloquer cet utilisateur" devient "Signaler" (aucune route ne cree de blocage,
// le cahier parle de signaler) ; pas de "En ligne" (le back n'enregistre pas la derniere activite) ; pas de reponses rapides, le cahier
// les reserve au producteur.
@Component({
  selector: 'app-client-thread',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-thread.component.html',
})
export class ClientThreadComponent {
  private readonly service = inject(MessagesService);
  private readonly store = inject(ClientMessagesStore);
  private readonly me = inject(AuthService).currentUser;
  private readonly refresh = new Subject<void>();

  private readonly id$ = inject(ActivatedRoute).paramMap.pipe(
    map((params) => params.get('id') ?? ''),
  );

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

  readonly draft = signal('');
  readonly sending = signal(false);
  readonly error = signal('');
  readonly menuOpen = signal(false);
  readonly reporting = signal(false);
  readonly reason = signal('');
  readonly reportMessage = signal('');

  readonly reasons = CLIENT_REPORT_REASONS;
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly count = computed(() => this.thread()?.messages.length ?? 0);

  readonly clockTime = clockTime;
  readonly title = conversationTitle;

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
    this.service
      .report(this.id(), { reason: this.reason(), message: this.reportMessage().trim() || null })
      .subscribe({
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
