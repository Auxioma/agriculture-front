import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ChoiceOption } from '../profile.model';

/** Liste de boutons radio réutilisée pour la langue et la devise. */
@Component({
  selector: 'app-choice-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="space-y-2 rounded-xl border border-grey-200 bg-white p-4">
      <legend class="sr-only">{{ legend() }}</legend>
      @for (option of options(); track option.value) {
        <label class="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            class="accent-agri"
            [name]="name()"
            [value]="option.value"
            [checked]="option.value === selected()"
            (change)="selectedChange.emit(option.value)"
          />
          {{ option.label }}
        </label>
      }
    </fieldset>
  `,
})
export class ChoiceSectionComponent {
  readonly options = input.required<ChoiceOption[]>();
  readonly selected = input.required<string>();
  readonly name = input.required<string>();
  readonly legend = input('');
  readonly selectedChange = output<string>();
}
