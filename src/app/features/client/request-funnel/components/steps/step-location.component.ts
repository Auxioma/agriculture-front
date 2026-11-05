import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { funnelUrl } from '../../funnel-steps';
import { GeocodingService } from '../../services/geocoding.service';
import { RequestDraftStore } from '../../state/request-draft.store';
import { AddressSuggestion, RADIUS_OPTIONS } from '../../models/request.model';
import { StepNavComponent } from '../step-nav.component';

const INPUT =
  'w-full rounded-lg border border-grey-400 bg-white px-3 py-2 text-sm focus:border-agri focus:outline-none focus:ring-1 focus:ring-agri';

@Component({
  selector: 'app-step-location',
  imports: [ReactiveFormsModule, StepNavComponent],
  template: `
    <form (submit)="$event.preventDefault(); next()" class="space-y-5">
      <h2 class="text-base font-bold text-fonts">Localisation</h2>

      <div class="relative">
        <label for="address" class="mb-1 block text-xs text-grey-700">Adresse ou ville</label>
        <input id="address" type="text" autocomplete="off" [formControl]="query" [class]="input" />

        @if (open() && suggestions().length) {
          <ul
            class="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-grey-400 bg-white shadow-md"
            aria-label="Adresses suggérées"
          >
            @for (s of suggestions(); track s.label) {
              <li>
                <button
                  type="button"
                  (click)="pick(s)"
                  class="block w-full px-3 py-2 text-left text-sm hover:bg-badge-bg"
                >
                  {{ s.label }}
                </button>
              </li>
            }
          </ul>
        }
      </div>

      <div>
        <label for="radius" class="mb-1 block text-xs text-grey-700">Choix du rayon</label>
        <select
          id="radius"
          [formControl]="radius"
          class="rounded-lg border border-grey-400 bg-white px-3 py-2 text-sm focus:border-agri focus:outline-none"
        >
          @for (r of radiusOptions; track r) {
            <option [value]="r">{{ r }} km</option>
          }
        </select>
      </div>

      <div class="flex gap-3" role="group" aria-label="Mode de récupération">
        <button
          type="button"
          (click)="pickup.set(!pickup())"
          [attr.aria-pressed]="pickup()"
          class="rounded-full px-6 py-2 text-sm font-medium"
          [class]="pickup() ? 'bg-agri text-white' : 'bg-grey-200 text-grey-700'"
        >
          Retrait
        </button>
        <button
          type="button"
          (click)="delivery.set(!delivery())"
          [attr.aria-pressed]="delivery()"
          class="rounded-full px-6 py-2 text-sm font-medium"
          [class]="delivery() ? 'bg-agri text-white' : 'bg-grey-200 text-grey-700'"
        >
          Livraison
        </button>
      </div>

      <!-- La carte (facultative d'après le cahier des charges) pourra être ajoutée ici plus tard. -->

      @if (error(); as message) {
        <p class="text-sm text-danger" role="alert">{{ message }}</p>
      }

      <app-step-nav [prevUrl]="prevUrl" />
    </form>
  `,
})
export class StepLocationComponent {
  private readonly store = inject(RequestDraftStore);
  private readonly router = inject(Router);
  private readonly geocoder = inject(GeocodingService);

  protected readonly input = INPUT;
  protected readonly prevUrl = funnelUrl(3);
  protected readonly radiusOptions = RADIUS_OPTIONS;

  private readonly draft = this.store.draft();
  protected readonly query = new FormControl(this.draft.addressText ?? '', { nonNullable: true });
  protected readonly radius = new FormControl(this.draft.radiusKm, { nonNullable: true });
  protected readonly pickup = signal(this.draft.pickupWanted);
  protected readonly delivery = signal(this.draft.deliveryWanted);

  /** Adresse validée = choisie dans la liste (c'est elle qui fournit latitude/longitude). */
  protected readonly selected = signal<AddressSuggestion | null>(null);
  protected readonly open = signal(false);
  protected readonly error = signal<string | null>(null);

  // Autocomplétion : on attend 300 ms après la dernière frappe (debounceTime) et switchMap annule
  // la requête précédente si l'utilisateur continue de taper → pas une requête par lettre.
  protected readonly suggestions = toSignal(
    this.query.valueChanges.pipe(
      tap((value) => {
        if (value !== this.selected()?.label) {
          this.selected.set(null); // l'utilisateur a modifié le texte : l'adresse validée n'est plus valable
          this.open.set(true);
        }
      }),
      debounceTime(300),
      map((value) => value.trim()),
      distinctUntilChanged(),
      switchMap((q) => (q.length < 3 ? of([] as AddressSuggestion[]) : this.geocoder.search(q))),
    ),
    { initialValue: [] as AddressSuggestion[] },
  );

  constructor() {
    this.store.step.set(4);

    // Retour sur l'étape : on restaure l'adresse déjà validée.
    const d = this.draft;
    if (d.addressText && d.city && d.latitude !== null && d.longitude !== null) {
      this.selected.set({
        label: d.addressText,
        city: d.city,
        postalCode: d.postalCode,
        latitude: d.latitude,
        longitude: d.longitude,
      });
    }
  }

  protected pick(s: AddressSuggestion): void {
    this.selected.set(s);
    this.query.setValue(s.label, { emitEvent: false }); // emitEvent:false → pas de nouvelle recherche
    this.open.set(false);
    this.error.set(null);
  }

  protected next(): void {
    const s = this.selected();
    if (!s) {
      this.error.set('Sélectionnez une adresse ou une ville dans la liste proposée.');
      return;
    }
    if (!this.pickup() && !this.delivery()) {
      this.error.set('Choisissez retrait, livraison, ou les deux.');
      return;
    }

    this.store.patch({
      addressText: s.label,
      city: s.city,
      postalCode: s.postalCode,
      latitude: s.latitude,
      longitude: s.longitude,
      radiusKm: Number(this.radius.value), // <select> renvoie du texte
      pickupWanted: this.pickup(),
      deliveryWanted: this.delivery(),
    });
    this.router.navigateByUrl(funnelUrl(5));
  }
}
