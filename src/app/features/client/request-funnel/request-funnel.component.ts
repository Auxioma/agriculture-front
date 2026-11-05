import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { RequestDraftStore } from './state/request-draft.store';

/** Page parente du tunnel : fil d'Ariane + pastilles d'étapes + étape courante (<router-outlet>). */
@Component({
  selector: 'app-request-funnel',
  imports: [RouterOutlet, RouterLink],
  template: `
    <section class="mx-auto w-full max-w-2xl px-4 py-6">
      <nav aria-label="Fil d'Ariane" class="text-sm text-fonts">
        <a routerLink="/" class="hover:underline">Accueil</a>
        <span class="mx-1">/</span>
        <span class="text-agri">Demande</span>
      </nav>

      @if (store.step() > 0) {
        <ol class="my-6 flex items-center justify-center gap-3" aria-label="Étapes de la demande">
          @for (n of steps; track n) {
            <li
              class="grid size-7 place-items-center rounded-full text-xs"
              [attr.aria-current]="n === store.step() ? 'step' : null"
              [class]="
                n === store.step() ? 'bg-gold-wheat text-white' : 'bg-grey-200 text-grey-700'
              "
            >
              {{ n }}
            </li>
          }
        </ol>
      }

      <router-outlet />
    </section>
  `,
})
export class RequestFunnelComponent {
  protected readonly store = inject(RequestDraftStore);
  protected readonly steps = [1, 2, 3, 4, 5, 6];
}
