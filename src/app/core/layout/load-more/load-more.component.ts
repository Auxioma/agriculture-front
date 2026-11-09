import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { hasMore } from '../../http/paged';

// « Voir plus » sous une liste paginée : n'apparaît que s'il reste des éléments à charger (le total de toutes les pages vient du back,
// voir core/http/paged.ts ; total inconnu = la liste reçue est entière). Le parent charge la page suivante quand `more` est émis.
@Component({
  selector: 'app-load-more',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (remaining()) {
      <div class="mt-4 text-center">
        <p class="mb-2 text-xs text-grey-700">{{ shown() }} sur {{ total() }}</p>
        <button
          type="button"
          (click)="more.emit()"
          [disabled]="loading()"
          class="cursor-pointer rounded-lg border border-agri px-5 py-2 text-sm font-semibold text-agri hover:bg-badge-bg disabled:cursor-default disabled:opacity-60"
        >
          {{ loading() ? 'Chargement…' : 'Voir plus' }}
        </button>
        @if (failed()) {
          <p role="alert" class="mt-2 text-sm text-danger">
            Impossible de charger la suite pour le moment. Réessayez.
          </p>
        }
      </div>
    }
  `,
})
export class LoadMoreComponent {
  /** Combien d'éléments sont déjà affichés (chargés, pas seulement ceux d'un filtre) */
  readonly shown = input.required<number>();
  /** Le total de toutes les pages ; null quand le back ne l'a pas donné */
  readonly total = input.required<number | null>();
  readonly loading = input(false);
  /** La dernière page demandée n'est pas arrivée */
  readonly failed = input(false);
  readonly more = output<void>();

  protected readonly remaining = computed(() => hasMore(this.shown(), this.total()));
}
