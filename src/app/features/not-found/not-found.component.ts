import { Component, DestroyRef, RESPONSE_INIT, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

// page affichée pour toute adresse que le site ne connaît pas (route '**', la dernière de app.routes.ts). Avant elle, un lien faux
// donnait une page vide. Rendue aussi côté serveur : RESPONSE_INIT permet de répondre 404 au lieu de 200 (rien à faire dans le
// navigateur, où il n'existe pas), et noindex garde les adresses fausses hors des moteurs de recherche.
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.component.html',
})
export class NotFoundComponent {
  constructor() {
    const title = inject(Title);
    const meta = inject(Meta);
    const response = inject(RESPONSE_INIT, { optional: true });

    title.setTitle('Page introuvable – TrouveMoi Agri');
    meta.updateTag({ name: 'robots', content: 'noindex' });
    if (response) response.status = 404;

    // le tag reste dans <head> quand on change de page sans recharger : sans ça, la page suivante resterait « noindex »
    inject(DestroyRef).onDestroy(() => meta.removeTag("name='robots'"));
  }
}
