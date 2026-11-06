import { Component } from '@angular/core';

// a la place d'une page qui attend ses donnees : des blocs gris qui pulsent, au lieu d'une zone vide. Se pose dans la branche
// "chargement" des pages de l'espace producteur (celles qui ont deja leur titre le gardent au dessus).
@Component({
  selector: 'app-page-skeleton',
  standalone: true,
  host: { class: 'block' },
  template: `
    <div role="status" aria-busy="true" class="space-y-3 px-4 pt-4 motion-safe:animate-pulse lg:px-0">
      <span class="sr-only">Chargement…</span>
      <div class="h-24 rounded-lg bg-grey-200"></div>
      <div class="h-16 rounded-lg bg-grey-200"></div>
      <div class="h-16 rounded-lg bg-grey-200"></div>
    </div>
  `,
})
export class PageSkeletonComponent {}
