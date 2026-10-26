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
import { Observable, finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { FavoriteType } from './favorite.model';
import { FavoriteService } from './favorite.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-favorite-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  `,
})
export class FavoriteButtonComponent {
  readonly targetType = input.required<FavoriteType>();
  readonly targetId = input.required<string>();

  private readonly service = inject(FavoriteService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly pending = signal(false);

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
      if (this.auth.isAuthenticated()) this.service.ensureLoaded();
    });
  }

  toggle(): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (this.pending()) return;

    this.pending.set(true);
    const fav = this.favorite();

    // Type commun aux deux branches : on ne se sert pas de la valeur retournée
    const request$: Observable<unknown> = fav
      ? this.service.remove(fav.id)
      : this.service.add(this.targetType(), this.targetId());

    request$.pipe(finalize(() => this.pending.set(false))).subscribe({
      error: (err: HttpErrorResponse) => {
        // 409 = déjà favori côté serveur (état local désynchronisé) → on recharge la liste
        if (err.status === 409) this.service.load().subscribe();
      },
    });
  }
}
