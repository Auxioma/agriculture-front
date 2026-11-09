import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SaveSearchButtonComponent } from '../../../client/dashboard/favorites/save-search-button.component';
import { ProducerListComponent } from '../../catalog-layouts/producer-list/producer-list.component';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Page /producers : tous les producteurs actifs, avec les mêmes filtres et tris que la page d'une catégorie. C'est aussi la page de
 * résultats de la recherche (cahier : « recherche produit / localisation ») : /producers?q=tomates&near=Lyon&categoryId=…, adresse que la
 * barre de recherche du site et le formulaire de la page construisent, et qui se partage.
 */
@Component({
  selector: 'app-producers',
  imports: [RouterLink, ProducerListComponent, SaveSearchButtonComponent],
  templateUrl: './producers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProducersComponent {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  /** Ce qu'on cherche : un mot ou plusieurs (nom de ferme, ville, produit, catégorie) */
  readonly q = computed(() => (this.params().get('q') ?? '').trim());
  /** Où : une ville ou un code postal, géocodé par la liste */
  readonly near = computed(() => (this.params().get('near') ?? '').trim());
  /** Une catégorie, choisie dans le panneau de filtres de la barre de recherche ; ignorée si ce n'est pas un identifiant */
  readonly categoryId = computed(() => {
    const id = this.params().get('categoryId');
    return id && UUID.test(id) ? id : null;
  });
  /** Un produit du catalogue (celui d'un favori, ou d'une recherche sauvegardée) : les producteurs qui le proposent */
  readonly productId = computed(() => {
    const id = this.params().get('productId');
    return id && UUID.test(id) ? id : null;
  });

  /** Relance la recherche : l'adresse change, la liste se met à jour (le reste des filtres reste celui de la liste) */
  search(text: string, location: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: text.trim() || null, near: location.trim() || null },
      queryParamsHandling: 'merge',
    });
  }

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
