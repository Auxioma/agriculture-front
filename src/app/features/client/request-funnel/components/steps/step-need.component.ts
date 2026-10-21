import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { funnelUrl } from '../../funnel-steps';
import { RequestDraftStore } from '../../state/request-draft.store';
import { NEED_OPTIONS, NeedType } from '../../models/request.model';
import { StepNavComponent } from '../step-nav.component';

@Component({
  selector: 'app-step-need',
  imports: [ReactiveFormsModule, StepNavComponent],
  template: `
    <form (submit)="$event.preventDefault(); next()" class="space-y-5">
      <h2 class="text-base font-bold text-fonts">Besoins</h2>

      <fieldset class="space-y-3">
        <legend class="sr-only">Type de besoin</legend>
        @for (o of options; track o.value) {
          <!-- Vrai <input type="radio"> masqué : clavier et lecteurs d'écran fonctionnent, la carte est le <label>. -->
          <label
            class="flex cursor-pointer items-center gap-3 rounded-lg border border-grey-400 bg-white p-3 has-checked:border-agri has-checked:bg-badge-bg has-focus-visible:ring-2 has-focus-visible:ring-agri"
          >
            <input
              type="radio"
              class="sr-only"
              name="needType"
              [value]="o.value"
              [formControl]="needType"
            />
            <span
              class="grid size-4 shrink-0 place-items-center rounded-full border border-grey-400 bg-white"
              aria-hidden="true"
            >
              @if (needType.value === o.value) {
                <span class="size-2.5 rounded-full bg-agri"></span>
              }
            </span>
            <span>
              <span class="block text-sm font-semibold text-fonts">{{ o.title }}</span>
              <span class="block text-xs text-grey-700">{{ o.subtitle }}</span>
            </span>
          </label>
        }
      </fieldset>

      @if (showError()) {
        <p class="text-sm text-danger" role="alert">Choisissez un type de besoin pour continuer.</p>
      }

      <app-step-nav [prevUrl]="prevUrl" />
    </form>
  `,
})
export class StepNeedComponent {
  private readonly store = inject(RequestDraftStore);
  private readonly router = inject(Router);

  protected readonly options = NEED_OPTIONS;
  protected readonly prevUrl = funnelUrl(1);
  protected readonly needType = new FormControl<NeedType | null>(
    this.store.draft().needType,
    Validators.required,
  );
  protected readonly showError = signal(false);

  constructor() {
    this.store.step.set(2);
  }

  protected next(): void {
    if (this.needType.invalid) {
      this.showError.set(true);
      return;
    }
    this.store.patch({ needType: this.needType.value });
    this.router.navigateByUrl(funnelUrl(3));
  }
}
