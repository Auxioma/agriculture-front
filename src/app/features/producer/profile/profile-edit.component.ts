import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, of, switchMap } from 'rxjs';
import { Coordinates } from '../../catalog/models/producer-summary.model';
import { GeocodingService } from '../../catalog/services/geocoding.service';
import { messageOf } from '../message-of';
import { PHOTO_MAX_BYTES, PHOTO_TYPES } from '../photo-rules';
import { CatalogLabel } from '../products/products.service';
import { HoursFieldComponent } from './hours-field.component';
import { hoursError, slotsFromApi } from './hours-format';
import { initials, kmText, labelStatus, largestRadius, parseKm, sameCity } from './profile-format';
import { Exploitation, HourSlot, ProfileInfo, ProfileLabel, ProfileService } from './profile.service';

const INPUT = 'w-full rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm placeholder:text-grey-500';

// apercu de la photo choisie (pas disponible partout : sans lui on garde l'image d'avant)
const previewOf = (file: File): string => (typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '');

// "Modifier mon profil" semblable au figma. Un seul bouton Enregistrer, qui enchaine les ecritures dans l'ordre :
// profil (avec la position si la ville change), couverture, labels, rayon de vente, horaires. Chacune peut etre refaite
// sans risque : si l'une echoue, le producteur reessaie et seul le reste est rejoue.
//  - Ecarts avec le figma : les horaires sont un editeur par jour (le back garde des creneaux, pas du texte libre) et
//    le "< 15 km" de la livraison n'existe pas en base.
//  - Les labels cochés sont seulement revendiques : ils ne deviennent des badges qu'une fois valides par l'admin
//    (le justificatif se depose dans "Labels et certifications", page a venir).
@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, HoursFieldComponent],
  templateUrl: './profile-edit.component.html',
})
export class ProfileEditComponent {
  private fb = inject(FormBuilder);
  private service = inject(ProfileService);
  private geocoding = inject(GeocodingService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly input = INPUT;
  readonly labelStatus = labelStatus;

  form = this.fb.nonNullable.group({
    // pattern : au moins un caractere visible, "   " n'est pas un nom
    farmName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    description: [''],
    city: [''],
    radius: [''],
    pickup: [false],
    delivery: [false],
  });

  state = signal<'loading' | 'ready' | 'error'>('loading');
  catalog = signal<CatalogLabel[]>([]);
  claimed = signal<ProfileLabel[]>([]);
  // tous les labels revendiques au depart, meme ceux que la liste ne propose plus : decocher est le seul moyen d'en retirer un
  ticked = signal<ReadonlySet<string>>(new Set());
  hours = signal<HourSlot[]>([]);
  cover = signal<string | null>(null);
  coverError = signal('');
  initials = signal('');
  saving = signal(false);
  error = signal('');

  // retirer un label deja valide : il faudra le faire valider de nouveau
  losesValidatedLabel = computed(() =>
    this.claimed().some((label) => !this.ticked().has(label.labelId) && labelStatus(label) === 'Validé'),
  );

  private baseline!: ProfileInfo;
  private coverFile: File | null = null;
  private preview: string | null = null;

  constructor() {
    forkJoin({ data: this.service.getExploitation(), catalog: this.service.getCatalogLabels() })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ data, catalog }) => this.fill(data, catalog),
        error: () => this.state.set('error'),
      });
    this.destroyRef.onDestroy(() => this.revokePreview());
  }

  claimedLabel(id: string): ProfileLabel | undefined {
    return this.claimed().find((label) => label.labelId === id);
  }

  toggleLabel(id: string): void {
    this.ticked.update((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  pickCover(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_BYTES) {
      this.coverError.set('Photo : jpeg, png ou webp, 5 Mo maximum.');
      return;
    }
    this.coverError.set('');
    this.revokePreview();
    this.coverFile = file;
    this.preview = previewOf(file) || null;
    if (this.preview) this.cover.set(this.preview);
  }

  save(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const km = parseKm(value.radius);
    if (km !== null && !(km > 0)) {
      this.error.set('Rayon de vente : indiquez un nombre de kilomètres supérieur à 0, ou laissez vide.');
      return;
    }
    const problem = hoursError(this.hours());
    if (problem) {
      this.error.set(problem);
      return;
    }

    this.saving.set(true);
    this.locate(value.city)
      .pipe(
        switchMap((coordinates) =>
          this.service.saveProfile({
            farmName: value.farmName.trim(),
            description: value.description.trim() || null,
            story: this.baseline.story,
            city: value.city.trim() || null,
            postalCode: this.baseline.postalCode,
            addressVisibility: this.baseline.addressVisibility,
            ...coordinates,
            pickupAvailable: value.pickup,
            deliveryAvailable: value.delivery,
          }),
        ),
        switchMap(() => (this.coverFile ? this.service.uploadCover(this.coverFile) : of(null))),
        switchMap(() => this.service.syncLabels([...this.ticked()])),
        switchMap(() => this.service.syncRadius(km)),
        switchMap(() => this.service.saveHours(this.hours())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.router.navigate(['/producer/profile']),
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.error.set(messageOf(err));
        },
      });
  }

  // la position ne suit que la ville : tant qu'elle ne change pas, on garde celle qui existe (peut-etre plus precise)
  // ? adresse.data.gouv.fr ne connait que la France : ville inconnue ou service en panne --> on enregistre quand meme, sans position
  private locate(city: string): Observable<Pick<Coordinates, 'latitude' | 'longitude'> | null> {
    const wanted = city.trim();
    if (wanted === '' || sameCity(wanted, this.baseline.city ?? '')) return of(null);

    return this.geocoding.locate(wanted).pipe(catchError(() => of(null)));
  }

  private fill(data: Exploitation, catalog: CatalogLabel[]): void {
    const profile = data.profile;
    const radius = largestRadius(data.zones);
    this.baseline = profile;
    this.form.patchValue({
      farmName: profile.farmName,
      description: profile.description ?? '',
      city: profile.city ?? '',
      radius: radius === null ? '' : kmText(radius),
      pickup: profile.pickupAvailable ?? false,
      delivery: profile.deliveryAvailable ?? false,
    });
    this.catalog.set(catalog);
    this.claimed.set(data.labels);
    this.ticked.set(new Set(data.labels.map((label) => label.labelId)));
    this.hours.set(slotsFromApi(data.openingHours));
    this.cover.set(profile.photoUrl);
    this.initials.set(initials(profile.farmName));
    this.state.set('ready');
  }

  private revokePreview(): void {
    if (this.preview) URL.revokeObjectURL?.(this.preview);
    this.preview = null;
  }
}
