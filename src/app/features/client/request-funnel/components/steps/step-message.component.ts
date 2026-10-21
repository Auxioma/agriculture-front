import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { funnelUrl } from '../../funnel-steps';
import { RequestDraftStore } from '../../state/request-draft.store';
import { StepNavComponent } from '../step-nav.component';

// 1500 et non 2000 (limite de l'API) : le store ajoute labels et préférence qualité au message.
const MAX = 1500;

@Component({
  selector: 'app-step-message',
  imports: [ReactiveFormsModule, StepNavComponent],
  template: `
    <form (submit)="$event.preventDefault(); next()" class="space-y-5">
      <h2 class="text-base font-bold text-fonts">Message</h2>

      <div>
        <label for="message" class="sr-only">Message pour les producteurs</label>
        <textarea
          id="message"
          rows="6"
          [maxlength]="max"
          [formControl]="message"
          placeholder="Décrivez votre besoin, vos attentes particulières…"
          class="w-full rounded-lg border border-grey-400 bg-white px-3 py-2 text-sm focus:border-agri focus:outline-none focus:ring-1 focus:ring-agri"
        ></textarea>
        <p class="mt-1 text-right text-xs text-grey-700">{{ length() }} / {{ max }}</p>
      </div>

      <!-- Pièce jointe : à ajouter quand l'API d'upload existera (aucun endpoint aujourd'hui). -->

      <app-step-nav [prevUrl]="prevUrl" />
    </form>
  `,
})
export class StepMessageComponent {
  private readonly store = inject(RequestDraftStore);
  private readonly router = inject(Router);

  protected readonly max = MAX;
  protected readonly prevUrl = funnelUrl(4);
  protected readonly message = new FormControl(this.store.draft().message ?? '', {
    nonNullable: true,
    validators: Validators.maxLength(MAX),
  });
  protected readonly length = toSignal(this.message.valueChanges.pipe(map((v) => v.length)), {
    initialValue: this.message.value.length,
  });

  constructor() {
    this.store.step.set(5);
  }

  protected next(): void {
    this.store.patch({ message: this.message.value.trim() || null }); // message facultatif
    this.router.navigateByUrl(funnelUrl(6));
  }
}
