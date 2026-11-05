import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Boutons « Précédent » / « Continuer » communs à toutes les étapes.
 * « Continuer » est un bouton `submit` : à placer DANS le <form> de l'étape, la touche Entrée marche alors aussi.
 */
@Component({
  selector: 'app-step-nav',
  imports: [RouterLink],
  template: `
    <div class="mt-8 flex items-center justify-between">
      @if (prevUrl(); as url) {
        <a
          [routerLink]="url"
          class="rounded-lg border border-agri/30 bg-badge-bg px-4 py-2 text-sm font-medium text-agri hover:border-agri"
        >
          Précédent
        </a>
      } @else {
        <span></span>
      }
      <button
        type="submit"
        [disabled]="loading()"
        class="rounded-lg bg-agri px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {{ nextLabel() }}
      </button>
    </div>
  `,
})
export class StepNavComponent {
  readonly prevUrl = input<string | null>(null);
  readonly nextLabel = input('Continuer');
  readonly loading = input(false);
}
