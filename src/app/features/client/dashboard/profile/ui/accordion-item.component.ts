import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Bloc repliable (accordéon). Le parent décide s'il est ouvert : le composant ne garde aucun état. */
@Component({
  selector: 'app-accordion-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h2>
        <button
          type="button"
          class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left"
          [attr.aria-expanded]="open()"
          [attr.aria-controls]="'panel-' + sectionId()"
          [id]="'header-' + sectionId()"
          (click)="toggled.emit()"
        >
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-badge-bg text-agri"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="h-4 w-4"
              aria-hidden="true"
            >
              <path [attr.d]="icon()"></path>
            </svg>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium text-fonts">{{ title() }}</span>
            <span class="block truncate text-xs text-grey-500">{{ subtitle() }}</span>
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="h-4 w-4 shrink-0 text-grey-700 transition-transform"
            [class.rotate-180]="open()"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6"></path>
          </svg>
        </button>
      </h2>
      @if (open()) {
        <div
          [id]="'panel-' + sectionId()"
          role="region"
          [attr.aria-labelledby]="'header-' + sectionId()"
          class="mt-1 mb-3"
        >
          <ng-content />
        </div>
      }
    </section>
  `,
})
export class AccordionItemComponent {
  readonly sectionId = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly icon = input.required<string>();
  readonly open = input(false);
  readonly toggled = output<void>();
}
