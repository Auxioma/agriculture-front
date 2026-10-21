import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of, tap } from 'rxjs';
import { FunnelCatalogService } from '../../services/funnel-catalog.service';
import { funnelUrl } from '../../funnel-steps';
import { RequestDraftStore } from '../../state/request-draft.store';
import { Unit } from '../../models/request.model';
import { StepNavComponent } from '../step-nav.component';

// Compare des chaînes 'YYYY-MM-DD' (pas des objets Date) : évite les pièges de fuseau horaire.
const today = () => new Date().toLocaleDateString('en-CA');
function notInPast(control: AbstractControl<string>): ValidationErrors | null {
  return !control.value || control.value >= today() ? null : { past: true };
}

const INPUT =
  'w-full rounded-lg border border-grey-400 bg-white px-3 py-2 text-sm focus:border-agri focus:outline-none focus:ring-1 focus:ring-agri';

@Component({
  selector: 'app-step-details',
  imports: [ReactiveFormsModule, StepNavComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="next()" class="space-y-5" novalidate>
      <h2 class="text-base font-bold text-fonts">Détails</h2>

      <div>
        <p class="mb-1 text-xs text-grey-700">Quantité *</p>
        <div class="grid grid-cols-2 gap-3">
          <input
            type="number"
            min="0"
            step="any"
            formControlName="quantity"
            placeholder="Quantité"
            aria-label="Quantité"
            [class]="input"
          />
          <select formControlName="unitId" aria-label="Unité" [class]="input">
            <option value="">Unité (ex. kg)</option>
            @for (u of units(); track u.id) {
              <option [value]="u.id">{{ u.label ? u.label + ' (' + u.code + ')' : u.code }}</option>
            }
          </select>
        </div>
        @if (unitsState() === 'error') {
          <p class="mt-1 text-xs text-danger" role="alert">
            Impossible de charger les unités. Réessayez plus tard.
          </p>
        } @else if (unitsState() === 'ok' && units().length === 0) {
          <p class="mt-1 text-xs text-danger" role="alert">
            Aucune unité disponible pour le moment.
          </p>
        }
        @if (invalid('quantity') || invalid('unitId')) {
          <p class="mt-1 text-xs text-danger" role="alert">
            Indiquez une quantité supérieure à 0 et une unité.
          </p>
        }
      </div>

      <div>
        <label for="budget" class="mb-1 block text-xs text-grey-700">Budget indicatif (€)</label>
        <input
          id="budget"
          type="number"
          min="0"
          step="any"
          formControlName="budgetMax"
          [class]="input"
        />
        @if (invalid('budgetMax')) {
          <p class="mt-1 text-xs text-danger" role="alert">Le budget ne peut pas être négatif.</p>
        }
      </div>

      <div>
        <label for="date" class="mb-1 block text-xs text-grey-700">Date souhaitée</label>
        <input
          id="date"
          type="date"
          [min]="minDate"
          formControlName="desiredDate"
          [class]="input"
        />
        @if (invalid('desiredDate')) {
          <p class="mt-1 text-xs text-danger" role="alert">
            La date ne peut pas être dans le passé.
          </p>
        }
      </div>

      <div>
        <label for="quality" class="mb-1 block text-xs text-grey-700">Préférence qualité</label>
        <input id="quality" type="text" maxlength="100" formControlName="quality" [class]="input" />
      </div>

      <app-step-nav [prevUrl]="prevUrl" />
    </form>
  `,
})
export class StepDetailsComponent {
  private readonly store = inject(RequestDraftStore);
  private readonly router = inject(Router);

  protected readonly input = INPUT;
  protected readonly prevUrl = funnelUrl(2);
  protected readonly minDate = today();

  protected readonly unitsState = signal<'loading' | 'ok' | 'error'>('loading');
  protected readonly units = toSignal(
    inject(FunnelCatalogService)
      .getUnits()
      .pipe(
        tap(() => this.unitsState.set('ok')),
        catchError(() => {
          this.unitsState.set('error');
          return of([] as Unit[]);
        }),
      ),
    { initialValue: [] as Unit[] },
  );

  private readonly draft = this.store.draft();

  // Seuls quantité + unité sont obligatoires. Budget, date et qualité sont facultatifs
  // (cahier des charges §6.1). Pour suivre la maquette à la lettre (tous les champs *),
  // ajoute Validators.required sur budgetMax, desiredDate et quality.
  protected readonly form = new FormGroup({
    quantity: new FormControl<number | null>(this.draft.quantity, [
      Validators.required,
      Validators.min(0.001),
    ]),
    unitId: new FormControl(this.draft.unitId ?? '', {
      nonNullable: true,
      validators: Validators.required,
    }),
    budgetMax: new FormControl<number | null>(this.draft.budgetMax, Validators.min(0)),
    desiredDate: new FormControl(this.draft.desiredDate ?? '', {
      nonNullable: true,
      validators: notInPast,
    }),
    quality: new FormControl(this.draft.quality ?? '', {
      nonNullable: true,
      validators: Validators.maxLength(100),
    }),
  });

  constructor() {
    this.store.step.set(3);
  }

  protected invalid(
    name: 'quantity' | 'unitId' | 'budgetMax' | 'desiredDate' | 'quality',
  ): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected next(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const unit = this.units().find((u) => u.id === v.unitId);

    this.store.patch({
      quantity: v.quantity,
      unitId: v.unitId,
      unitLabel: unit?.code ?? null,
      budgetMax: v.budgetMax,
      desiredDate: v.desiredDate || null,
      quality: v.quality.trim() || null,
    });
    this.router.navigateByUrl(funnelUrl(4));
  }
}
