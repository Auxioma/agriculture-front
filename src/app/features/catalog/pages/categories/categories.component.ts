import { ChangeDetectionStrategy, Component, signal, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { CatalogService } from '../../services/catalog.service';
import { isInSeason } from '../../utils/season';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './categories.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesComponent {
  private catalog = inject(CatalogService);

  private readonly data = toSignal(
    forkJoin({
      categories: this.catalog.getCategories(),
      products: this.catalog.getProducts(),
    }).pipe(catchError(() => of(null))),
  );

  readonly seasonalOnly = signal(false);
  readonly isLoading = computed(() => this.data() === undefined);
  readonly hasError = computed(() => this.data() === null);

  readonly families = computed(() => {
    const d = this.data();
    if (!d) return [];
    const roots = d.categories.filter((c) => c.parentId === null);
    if (!this.seasonalOnly()) return roots;
    const seasonal = new Set(d.products.filter((p) => isInSeason(p)).map((p) => p.categoryId));
    return roots.filter((c) => seasonal.has(c.id));
  });
}
