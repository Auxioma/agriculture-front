import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ProducerListComponent } from '../../catalog-layouts/producer-list/producer-list.component';

/** Page /producers : tous les producteurs actifs, avec les mêmes filtres et tris que la page d'une catégorie */
@Component({
  selector: 'app-producers',
  imports: [RouterLink, ProducerListComponent],
  templateUrl: './producers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProducersComponent {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  constructor() {
    // * SEO : titre et description propres à la page (rendus aussi côté serveur)
    this.title.setTitle('Producteurs – TrouveMoi Agri');
    this.meta.updateTag({
      name: 'description',
      content:
        'Trouvez des producteurs agricoles vérifiés près de chez vous : filtrez par label, retrait, livraison et note.',
    });
  }
}
