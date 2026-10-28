import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage } from '../api-error';
import { Address, AddressPayload, COUNTRY_OPTIONS } from '../profile.model';
import { ProfileService } from '../profile.service';
import { UI } from '../ui/ui-classes';

@Component({
  selector: 'app-addresses-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="ui.panel + ' space-y-3'">
      @if (loading()) {
        <p class="text-xs text-grey-500">Chargement…</p>
      }

      @for (address of addresses(); track address.id) {
        <div class="rounded-lg border border-grey-200 p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-medium">
                {{ address.label }}
                @if (address.isDefault) {
                  <span
                    class="ml-1 rounded-full bg-badge-bg px-2 py-0.5 text-[10px] font-medium text-agri"
                    >Par défaut</span
                  >
                }
              </p>
              <p class="text-xs text-grey-700">
                {{ address.address1 }}, {{ address.postalCode }} {{ address.city }}
              </p>
            </div>
            <div class="flex shrink-0 gap-3 text-xs font-medium">
              <button type="button" class="cursor-pointer text-agri" (click)="startEdit(address)">
                Modifier
              </button>
              <button type="button" class="cursor-pointer text-danger" (click)="remove(address)">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      } @empty {
        @if (!loading()) {
          <p class="text-xs text-grey-500">Aucune adresse enregistrée.</p>
        }
      }

      @if (editing() !== null) {
        <form
          [formGroup]="form"
          (ngSubmit)="save()"
          class="space-y-3 rounded-lg border border-grey-200 p-3"
          novalidate
        >
          <div>
            <label for="addr-label" [class]="ui.label">Nom (Domicile, Bureau…)</label>
            <input id="addr-label" formControlName="label" [class]="ui.input" />
          </div>
          <div>
            <label for="addr-1" [class]="ui.label">Adresse</label>
            <input
              id="addr-1"
              formControlName="address1"
              autocomplete="address-line1"
              [class]="ui.input"
            />
          </div>
          <div>
            <label for="addr-2" [class]="ui.label">Complément (facultatif)</label>
            <input
              id="addr-2"
              formControlName="address2"
              autocomplete="address-line2"
              [class]="ui.input"
            />
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label for="addr-zip" [class]="ui.label">Code postal</label>
              <input
                id="addr-zip"
                formControlName="postalCode"
                autocomplete="postal-code"
                [class]="ui.input"
              />
            </div>
            <div class="col-span-2">
              <label for="addr-city" [class]="ui.label">Ville</label>
              <input
                id="addr-city"
                formControlName="city"
                autocomplete="address-level2"
                [class]="ui.input"
              />
            </div>
          </div>
          <div>
            <label for="addr-country" [class]="ui.label">Pays</label>
            <select id="addr-country" formControlName="countryCode" [class]="ui.input">
              @for (country of countries; track country.value) {
                <option [value]="country.value">{{ country.label }}</option>
              }
            </select>
          </div>
          <label class="flex cursor-pointer items-center gap-2 text-xs">
            <input type="checkbox" formControlName="isDefault" class="accent-agri" />
            Définir comme adresse par défaut
          </label>

          @if (form.touched && form.invalid) {
            <p [class]="ui.error">Vérifiez les champs obligatoires.</p>
          }
          <div class="flex gap-2">
            <button type="submit" [class]="ui.primary" [disabled]="saving()">Enregistrer</button>
            <button type="button" [class]="ui.secondary" (click)="cancel()">Annuler</button>
          </div>
        </form>
      } @else {
        <button type="button" [class]="ui.secondary" (click)="startAdd()">
          + Ajouter une adresse
        </button>
      }

      @if (error()) {
        <p role="alert" [class]="ui.error">{{ error() }}</p>
      }
    </div>
  `,
})
export class AddressesSectionComponent implements OnInit {
  private readonly profile = inject(ProfileService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly ui = UI;
  protected readonly countries = COUNTRY_OPTIONS;

  readonly addresses = signal<Address[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  /** null = formulaire fermé ; 'new' = ajout ; sinon id de l'adresse en cours de modification. */
  readonly editing = signal<string | 'new' | null>(null);

  readonly form = this.fb.group({
    label: ['', [Validators.required, Validators.maxLength(120)]],
    address1: ['', Validators.required],
    address2: [''],
    city: ['', Validators.required],
    postalCode: ['', [Validators.required, Validators.maxLength(20)]],
    countryCode: ['FR', Validators.required],
    isDefault: [false],
  });

  ngOnInit(): void {
    this.load();
  }

  startAdd(): void {
    this.form.reset({ countryCode: 'FR', isDefault: this.addresses().length === 0 });
    this.editing.set('new');
  }

  startEdit(address: Address): void {
    this.form.reset({ ...address, address2: address.address2 ?? '' });
    this.editing.set(address.id);
  }

  cancel(): void {
    this.editing.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: AddressPayload = { ...value, address2: value.address2.trim() || null };
    const id = this.editing();
    const request$ =
      id === 'new' || id === null
        ? this.profile.createAddress(payload)
        : this.profile.updateAddress(id, payload);

    this.error.set(null);
    this.saving.set(true);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.load(); // recharge : le "par défaut" a pu changer sur d'autres adresses
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, "Impossible d'enregistrer l'adresse."));
      },
    });
  }

  remove(address: Address): void {
    this.error.set(null);
    this.profile.deleteAddress(address.id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(apiErrorMessage(err, 'Suppression impossible.')),
    });
  }

  private load(): void {
    this.profile.addresses().subscribe({
      next: (list) => {
        this.addresses.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Impossible de charger vos adresses.'));
      },
    });
  }
}
