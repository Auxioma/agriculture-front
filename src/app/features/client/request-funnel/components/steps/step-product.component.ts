import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { FunnelCatalogService } from '../../services/funnel-catalog.service';
import { funnelUrl } from '../../funnel-steps';
import { RequestDraftStore } from '../../state/request-draft.store';
import { Category, Label, Product } from '../../models/request.model';
import { StepNavComponent } from '../step-nav.component';

@Component({
  selector: 'app-step-product',
  imports: [StepNavComponent],
  template: `
    <form (submit)="$event.preventDefault(); next()" class="space-y-5">
      <h2 class="text-base font-bold text-fonts">Produit</h2>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Catégorie">
        @for (c of roots(); track c.id) {
          <button
            type="button"
            (click)="toggleCategory(c.id)"
            [attr.aria-pressed]="categoryId() === c.id"
            class="rounded-lg border px-3 py-2 text-sm"
            [class]="
              categoryId() === c.id
                ? 'border-agri bg-badge-bg text-agri'
                : 'border-grey-400 bg-white text-fonts'
            "
          >
            {{ c.name }}
          </button>
        }
      </div>

      <div>
        <label for="product" class="mb-1 block text-xs text-grey-700">Produit exact</label>
        <input
          #q
          id="product"
          type="text"
          autocomplete="off"
          [value]="query()"
          (input)="onQuery(q.value)"
          class="w-full rounded-lg border border-grey-400 bg-white px-3 py-2 text-sm focus:border-agri focus:outline-none focus:ring-1 focus:ring-agri"
        />
        @if (suggestions().length) {
          <ul class="mt-2 flex flex-wrap gap-2" aria-label="Suggestions">
            @for (p of suggestions(); track p.id) {
              <li>
                <button
                  type="button"
                  (click)="pick(p)"
                  class="rounded border border-grey-400 bg-white px-2 py-0.5 text-xs hover:border-agri"
                >
                  {{ p.name }}
                </button>
              </li>
            }
          </ul>
        }
      </div>

      @if (availableLabels().length) {
        <div>
          <p class="mb-1 text-xs text-grey-700">Label souhaité</p>
          <ul class="flex flex-wrap gap-2">
            @for (l of availableLabels(); track l.id) {
              <li>
                <button
                  type="button"
                  (click)="toggleLabel(l.name)"
                  [attr.aria-pressed]="selectedLabels().includes(l.name)"
                  class="rounded px-2 py-0.5 text-xs"
                  [class]="
                    selectedLabels().includes(l.name)
                      ? 'bg-agri text-white'
                      : 'bg-badge-bg text-agri'
                  "
                >
                  {{ l.name }}
                </button>
              </li>
            }
          </ul>
        </div>
      }

      @if (error(); as message) {
        <p class="text-sm text-danger" role="alert">{{ message }}</p>
      }

      <app-step-nav />
    </form>
  `,
})
export class StepProductComponent {
  private readonly store = inject(RequestDraftStore);
  private readonly router = inject(Router);
  private readonly catalog = inject(FunnelCatalogService);

  protected readonly categories = toSignal(
    this.catalog.getCategories().pipe(catchError(() => of([] as Category[]))),
    {
      initialValue: [] as Category[],
    },
  );
  protected readonly products = toSignal(
    this.catalog.getProducts().pipe(catchError(() => of([] as Product[]))),
    {
      initialValue: [] as Product[],
    },
  );
  protected readonly availableLabels = toSignal(
    this.catalog.getLabels().pipe(catchError(() => of([] as Label[]))),
    {
      initialValue: [] as Label[],
    },
  );

  // L'API renvoie aussi les sous-catégories : la grille n'affiche que les catégories racines.
  protected readonly roots = computed(() => this.categories().filter((c) => c.parentId === null));

  private readonly draft = this.store.draft();
  protected readonly categoryId = signal<string | null>(this.draft.categoryId);
  protected readonly query = signal(this.draft.productLabel ?? '');
  protected readonly selectedProductId = signal<string | null>(this.draft.productId);
  protected readonly selectedLabels = signal<string[]>(this.draft.labels);
  protected readonly error = signal<string | null>(null);

  // Catégorie choisie + ses sous-catégories (un produit peut être rattaché à une sous-catégorie).
  private readonly allowedCategoryIds = computed(() => {
    const id = this.categoryId();
    if (!id) return null;
    return new Set([
      id,
      ...this.categories()
        .filter((c) => c.parentId === id)
        .map((c) => c.id),
    ]);
  });

  protected readonly suggestions = computed(() => {
    const text = this.query().trim().toLowerCase();
    if (text.length < 2 || this.selectedProductId()) return [];
    const allowed = this.allowedCategoryIds();
    return this.products()
      .filter((p) => (!allowed || allowed.has(p.categoryId)) && p.name.toLowerCase().includes(text))
      .slice(0, 5);
  });

  constructor() {
    this.store.step.set(1);
  }

  protected toggleCategory(id: string): void {
    this.categoryId.update((current) => (current === id ? null : id));
  }

  protected onQuery(value: string): void {
    this.query.set(value);
    this.selectedProductId.set(null); // on retape : la sélection précédente n'est plus valable
    this.error.set(null);
  }

  protected pick(product: Product): void {
    this.selectedProductId.set(product.id);
    this.query.set(product.name);
  }

  protected toggleLabel(name: string): void {
    this.selectedLabels.update((list) =>
      list.includes(name) ? list.filter((l) => l !== name) : [...list, name],
    );
  }

  protected next(): void {
    const text = this.query().trim();
    if (!text) {
      this.error.set('Choisissez ou saisissez un produit.');
      return;
    }

    // Produit du catalogue = sélectionné dans les suggestions, ou nom saisi identique à un produit.
    const product =
      this.products().find((p) => p.id === this.selectedProductId()) ??
      this.products().find((p) => p.name.toLowerCase() === text.toLowerCase()) ??
      null;

    // L'API exige productId OU customProduct : une catégorie seule ne suffit pas.
    const categoryId = this.categoryId() ?? product?.categoryId ?? null;
    const category = this.categories().find((c) => c.id === categoryId);

    this.store.patch({
      categoryId,
      categoryLabel: category?.name ?? null,
      productId: product?.id ?? null,
      customProduct: product ? null : text,
      productLabel: product?.name ?? text,
      labels: this.selectedLabels(),
    });
    this.router.navigateByUrl(funnelUrl(2));
  }
}
