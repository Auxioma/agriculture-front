import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ProducerListComponent } from '../../catalog-layouts/producer-list/producer-list.component';
import { CatalogService } from '../../services/catalog.service';

/** Page /categories/:slug : retrouve la catégorie du slug, puis affiche la liste de ses producteurs */
@Component({
  selector: 'app-category-producers',
  imports: [RouterLink, ProducerListComponent],
  templateUrl: './category-producers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryProducersComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);

  // ── Catégorie courante, retrouvée grâce au slug de l'URL (/categories/:slug) ──
  private readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug'))));
  // undefined = chargement, null = erreur API, tableau = prêt
  private readonly categories = toSignal(
    this.catalog.getCategories().pipe(catchError(() => of(null))),
  );
  readonly category = computed(() => this.categories()?.find((c) => c.slug === this.slug()));
  readonly categoryNotFound = computed(() => !!this.categories() && !this.category());
}
