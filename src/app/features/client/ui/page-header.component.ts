import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <header [class]="banner() ? 'bg-badge-bg px-4 py-4 lg:bg-transparent lg:px-0 lg:py-0' : ''">
      <h1 class="text-xl font-bold lg:text-2xl">{{ title() }}</h1>
    </header>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  /** true : bandeau coloré sur mobile. false : titre seul (le parent gère les marges). */
  readonly banner = input(true);
}
