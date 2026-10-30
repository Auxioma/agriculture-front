import { Component, computed, input } from '@angular/core';

// cinq etoiles dont les premieres sont jaunes : une note de 4,8 en montre 5, une de 3,2 en montre 3. Le texte lu par un lecteur
// d'ecran est la note, les etoiles elles-memes sont cachees.
@Component({
  selector: 'app-stars',
  standalone: true,
  template: `
    <span role="img" [attr.aria-label]="label()" class="inline-flex gap-0.5">
      @for (filled of stars(); track $index) {
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" [class]="size() + (filled ? ' text-warning' : ' text-grey-200')">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
        </svg>
      }
    </span>
  `,
})
export class StarsComponent {
  readonly rating = input.required<number>();
  readonly size = input('h-4 w-4');

  stars = computed(() => Array.from({ length: 5 }, (_, i) => i < Math.round(this.rating())));
  label = computed(() => `${this.rating().toLocaleString('fr-FR')} sur 5`);
}
