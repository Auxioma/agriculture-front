import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { funnelUrl } from '../../funnel-steps';
import { RequestDraftStore } from '../../state/request-draft.store';

/** Confirmation. À remplacer par une redirection vers « Mes demandes » quand le dashboard client existera. */
@Component({
  selector: 'app-step-sent',
  imports: [RouterLink],
  template: `
    <div class="mt-10 space-y-4 text-center">
      <h2 class="text-base font-bold text-fonts">Demande envoyée</h2>
      <p class="text-sm text-grey-700">
        Les producteurs correspondant à votre besoin ont été prévenus. Vous recevrez une
        notification dès qu'un producteur répond.
      </p>
      <div class="flex justify-center gap-3 pt-2">
        <a
          routerLink="/"
          class="rounded-lg border border-agri/30 bg-badge-bg px-4 py-2 text-sm font-medium text-agri hover:border-agri"
        >
          Retour à l'accueil
        </a>
        <a
          [routerLink]="newRequestUrl"
          class="rounded-lg bg-agri px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Faire une autre demande
        </a>
      </div>
    </div>
  `,
})
export class StepSentComponent {
  protected readonly newRequestUrl = funnelUrl(1);

  constructor() {
    inject(RequestDraftStore).step.set(0); // 0 = on masque les pastilles d'étapes
  }
}
