import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { SavedSearchCriteria } from './saved-search.model';
import { SavedSearchService } from './saved-search.service';

/**
 * « Enregistrer cette recherche » sur la page /producers : retient le texte, le lieu, la catégorie et le produit de l'adresse
 * (rien à enregistrer sans aucun critère, le bouton n'apparaît pas). Les recherches se retrouvent dans Mes favoris, onglet Recherches.
 */
@Component({
  selector: 'app-save-search-button',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (hasCriteria()) {
      <div class="mt-3 mb-4">
        @if (saved()) {
          <p role="status" class="text-sm text-agri">
            Recherche enregistrée.
            <a routerLink="/client/favorites" class="font-medium underline">Voir mes favoris</a>
          </p>
        } @else if (!open()) {
          <button
            type="button"
            (click)="start()"
            class="cursor-pointer rounded-lg border border-agri px-4 py-2 text-sm font-medium text-agri hover:bg-badge-bg"
          >
            Enregistrer cette recherche
          </button>
        } @else {
          <form
            (submit)="$event.preventDefault(); save()"
            class="flex flex-col gap-2 md:flex-row md:items-center"
          >
            <label for="saved-search-name" class="text-sm font-medium text-grey-700"
              >Nom de la recherche</label
            >
            <input
              #nameField
              id="saved-search-name"
              type="text"
              name="name"
              maxlength="120"
              placeholder="Nom de la recherche"
              [value]="name()"
              (input)="name.set(nameField.value)"
              class="min-w-0 rounded-lg border border-grey-400 bg-white px-4 py-2 text-base focus-visible:outline-2 focus-visible:outline-agri md:w-72"
            />
            <div class="flex gap-2">
              <button
                type="submit"
                [disabled]="pending() || !name().trim()"
                class="cursor-pointer rounded-lg bg-agri px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-default disabled:opacity-60"
              >
                Enregistrer
              </button>
              <button
                type="button"
                (click)="open.set(false)"
                class="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-grey-700 hover:bg-badge-bg"
              >
                Annuler
              </button>
            </div>
          </form>
          @if (failed()) {
            <p role="alert" class="mt-2 text-sm text-danger">
              Impossible d'enregistrer la recherche pour le moment. Réessayez.
            </p>
          }
        }
      </div>
    }
  `,
})
export class SaveSearchButtonComponent {
  readonly text = input('');
  readonly place = input('');
  readonly categoryId = input<string | null>(null);
  readonly productId = input<string | null>(null);

  private readonly service = inject(SavedSearchService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly nameField = viewChild<ElementRef<HTMLInputElement>>('nameField');

  /** Seulement les critères renseignés : c'est ce que /producers sait relire */
  readonly criteria = computed<SavedSearchCriteria>(() => {
    const criteria: SavedSearchCriteria = {};
    if (this.text()) criteria.q = this.text();
    if (this.place()) criteria.near = this.place();
    const categoryId = this.categoryId();
    if (categoryId) criteria.categoryId = categoryId;
    const productId = this.productId();
    if (productId) criteria.productId = productId;

    return criteria;
  });
  readonly hasCriteria = computed(() => Object.keys(this.criteria()).length > 0);

  // La recherche change (nouvelle adresse) : le formulaire se referme, le nom proposé et la confirmation repartent de zéro
  readonly open = linkedSignal(() => (this.criteria(), false));
  readonly saved = linkedSignal(() => (this.criteria(), false));
  readonly name = linkedSignal(() => [this.text(), this.place()].filter(Boolean).join(', '));
  readonly pending = signal(false);
  readonly failed = signal(false);

  constructor() {
    // Le formulaire remplace le bouton : sans ça le focus clavier se perd
    effect(() => this.nameField()?.nativeElement.focus());
  }

  start(): void {
    if (!this.auth.isAuthenticated()) {
      this.goToLogin();
      return;
    }
    this.failed.set(false);
    this.open.set(true);
  }

  save(): void {
    const name = this.name().trim();
    if (!name || this.pending()) return;

    this.failed.set(false);
    this.pending.set(true);
    this.service
      .create(name, this.criteria())
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => this.saved.set(true),
        error: (err: HttpErrorResponse) => {
          // 401 = session expirée : on repasse par la connexion, la recherche est dans l'adresse de retour
          if (err.status === 401) this.goToLogin();
          else this.failed.set(true);
        },
      });
  }

  private goToLogin(): void {
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
  }
}
