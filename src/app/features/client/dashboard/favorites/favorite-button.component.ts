import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, of, switchMap } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { FavoriteType } from './favorite.model';
import { FavoriteService } from './favorite.service';
import { HttpErrorResponse } from '@angular/common/http';

// Un clic sans être connecté mène à la connexion : on retient la cible pour l'ajouter au retour sur la page, sinon le clic est perdu
// et le cœur « ne marche pas ». sessionStorage : propre à l'onglet, vidé à sa fermeture ; au-delà de 10 minutes on n'y croit plus.
const PENDING_KEY = 'pendingFavorite';
const PENDING_MAX_AGE_MS = 10 * 60 * 1000;

function savePending(type: FavoriteType, id: string): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ type, id, at: Date.now() }));
  } catch {
    // stockage indisponible (navigation privée...) : tant pis, le clic sera à refaire
  }
}

/** true si ce bouton est la cible retenue avant la connexion. Une demande périmée est jetée, celle d'un autre bouton est gardée. */
function takePending(type: FavoriteType, id: string): boolean {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return false;
    const pending = JSON.parse(raw) as { type?: string; id?: string; at?: number };
    if (Date.now() - (pending.at ?? 0) > PENDING_MAX_AGE_MS) {
      sessionStorage.removeItem(PENDING_KEY);
      return false;
    }
    if (pending.type !== type || pending.id !== id) return false;
    sessionStorage.removeItem(PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-favorite-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-block' },
  template: `
    <button
      type="button"
      (click)="toggle()"
      [disabled]="pending()"
      [attr.aria-pressed]="isFavorite()"
      [attr.aria-label]="isFavorite() ? 'Retirer des favoris' : 'Ajouter aux favoris'"
      class="flex size-10 items-center justify-center rounded-full bg-white shadow transition hover:scale-105 disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        class="size-5 text-agri"
        [attr.fill]="isFavorite() ? 'currentColor' : 'none'"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        />
      </svg>
    </button>
    @if (failed()) {
      <p
        role="alert"
        class="absolute top-12 right-0 z-20 w-52 rounded-lg bg-white p-2 text-xs text-danger shadow"
      >
        Impossible de modifier vos favoris pour le moment. Réessayez.
      </p>
    }
  `,
})
export class FavoriteButtonComponent {
  readonly targetType = input.required<FavoriteType>();
  readonly targetId = input.required<string>();

  private readonly service = inject(FavoriteService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly pending = signal(false);
  /** La dernière modification a échoué (autrement que par une session expirée ou un doublon) : on le dit à côté du cœur. */
  readonly failed = signal(false);

  // Le favori correspondant à cette cible (undefined si pas favori)
  private readonly favorite = computed(() =>
    this.service
      .favorites()
      .find((f) => f.targetType === this.targetType() && f.targetId === this.targetId()),
  );
  readonly isFavorite = computed(() => this.favorite() !== undefined);

  constructor() {
    // Uniquement dans le navigateur : le rendu serveur (SSR) n'a pas le token de l'utilisateur
    afterNextRender(() => {
      if (!this.auth.isAuthenticated()) return;
      this.service.ensureLoaded();
      if (takePending(this.targetType(), this.targetId())) this.replay();
    });
  }

  toggle(): void {
    if (!this.auth.isAuthenticated()) {
      savePending(this.targetType(), this.targetId());
      this.goToLogin();
      return;
    }
    if (this.pending()) return;

    this.failed.set(false);
    this.pending.set(true);
    const fav = this.favorite();

    // Type commun aux deux branches : on ne se sert pas de la valeur retournée
    const request$: Observable<unknown> = fav
      ? this.service.remove(fav.id)
      : this.service.add(this.targetType(), this.targetId());

    request$.pipe(finalize(() => this.pending.set(false))).subscribe({
      error: (err: HttpErrorResponse) => {
        // 409 = déjà favori côté serveur (état local désynchronisé) → on recharge la liste
        if (err.status === 409) {
          this.service.load().subscribe();
          return;
        }
        // 401 = session expirée : même chemin qu'un clic sans être connecté, la cible est retenue pour le retour
        if (err.status === 401) {
          savePending(this.targetType(), this.targetId());
          this.goToLogin();
          return;
        }
        this.failed.set(true);
      },
    });
  }

  // le favori demandé avant la connexion : liste à jour d'abord, puis ajout, sauf s'il y est déjà
  private replay(): void {
    this.pending.set(true);
    this.service
      .load()
      .pipe(
        switchMap(() =>
          this.favorite() ? of(null) : this.service.add(this.targetType(), this.targetId()),
        ),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({ error: () => this.failed.set(true) });
  }

  private goToLogin(): void {
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
  }
}
