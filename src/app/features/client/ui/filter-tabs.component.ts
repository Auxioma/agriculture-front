import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface FilterTab<T extends string = string> {
  key: T;
  label: string;
}

@Component({
  selector: 'app-filter-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      class="no-scrollbar flex gap-2 overflow-x-auto"
      role="group"
      [attr.aria-label]="ariaLabel()"
    >
      @for (tab of tabs(); track tab.key) {
        <button
          type="button"
          [attr.aria-pressed]="active() === tab.key"
          (click)="active.set(tab.key)"
          class="shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
          [class]="
            active() === tab.key
              ? 'border-agri bg-agri text-white'
              : 'border-grey-200 bg-white text-grey-700 hover:bg-badge-bg'
          "
        >
          {{ tab.label }}
        </button>
      }
    </div>
  `,
})
export class FilterTabsComponent<T extends string = string> {
  readonly tabs = input.required<readonly FilterTab<T>[]>();
  readonly ariaLabel = input.required<string>();
  /** `model` = signal que le parent ET l'enfant peuvent modifier (liaison à double sens). */
  readonly active = model.required<T>();
}
