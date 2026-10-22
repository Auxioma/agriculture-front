import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, catchError, concatMap, from, map, of, switchMap, toArray } from 'rxjs';
import { PHOTO_MAX_BYTES, PHOTO_TYPES } from '../photo-rules';
import { MONTH_OPTIONS, productDetails, productTitle, unitText } from './product-format';
import { AvailabilityPayload, ProducerProduct, ProductPhoto, ProductUnit, ProductsService, payloadOf } from './products.service';

// categorie fictive des produits dont la categorie n'est pas dans la liste (desactivee par exemple)
const OTHERS = 'others';

const INPUT = 'w-full rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm placeholder:text-grey-500';

const PHOTO_MAX = 5;

// "12,5" ou "12.5" -> nombre, null si vide, NaN si ce n'est pas un nombre
const toNumber = (text: string): number | null => (text.trim() === '' ? null : Number(text.trim().replace(',', '.')));

// "90.000" -> "90", "3.50" -> "3,5" (pour remplir le formulaire)
const plain = (value: string | null): string => (value === null ? '' : String(Number(value)).replace('.', ','));

// apercu d'une photo choisie (pas disponible partout : sans lui la vignette reste vide)
const previewOf = (file: File): string => (typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '');

// message du back : { error } a la main, ou la 1re violation quand c'est la validation (422)
const messageOf = (err: HttpErrorResponse): string =>
  err.error?.error ?? err.error?.violations?.[0]?.title ?? 'Action impossible pour le moment.';

// page "Produits et disponibilites" semblable au figma, branchee sur /api/producer/products. Un produit "disponible" est
// propose dans les demandes : le matching ne garde que les producteurs qui ont le produit demande ET actif.
// Ajout et modification passent par la meme fenetre (le figma en fait une page, une modale va aussi), la suppression par
// la modification. Ce que le producteur regle pour chaque produit : categorie puis produit du catalogue, variete,
// description, periode (mois de debut et de fin), volume et unite, prix indicatif, labels, photos, disponibilite.
//  - la periode, le volume et l'unite sont son "creneau" de disponibilite cote back (product_availabilities) ; sans periode,
//    la liste montre la saison du catalogue. Le prix est par unite : "€/kg" suit l'unite choisie, pas de 2e liste.
//  - les labels sont declares par produit (non verifies) ; ceux de l'exploitation, verifies, iront avec la page profil.
//  - une photo ne s'envoie qu'une fois le produit enregistre (il faut son identifiant) : le formulaire enchaine les deux.
// La devise est toujours l'euro.
@Component({
  selector: 'app-producer-products',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './products.component.html',
})
export class ProductsComponent {
  private fb = inject(FormBuilder);
  private service = inject(ProductsService);

  readonly input = INPUT;
  readonly title = productTitle;
  readonly details = productDetails;
  readonly months = MONTH_OPTIONS;
  readonly maxPhotos = PHOTO_MAX;

  // undefined = chargement, null = impossible de les lire (voir loadError)
  products = signal<ProducerProduct[] | null | undefined>(undefined);
  loadError = signal('');
  notice = signal('');
  error = signal('');
  // produit dont l'interrupteur est en cours d'enregistrement
  busyId = signal('');

  catalog = toSignal(this.service.getCatalog().pipe(catchError(() => of([]))), { initialValue: [] });
  categories = toSignal(this.service.getCategories().pipe(catchError(() => of([]))), { initialValue: [] });
  units = toSignal(this.service.getUnits().pipe(catchError(() => of([]))), { initialValue: [] as ProductUnit[] });
  catalogLabels = toSignal(this.service.getLabels().pipe(catchError(() => of([]))), { initialValue: [] });

  // la fenetre : 'new' = ajout, un produit = modification, null = fermee
  editing = signal<'new' | ProducerProduct | null>(null);
  saving = signal(false);
  formError = signal('');
  confirmingDelete = signal(false);
  form = this.fb.nonNullable.group({
    categoryId: '',
    productId: '',
    variety: '',
    description: '',
    startMonth: '',
    endMonth: '',
    volume: '',
    unitId: '',
    price: '',
    isActive: true,
  });
  chosenLabels = signal<string[]>([]);
  // photos deja enregistrees (modification) et photos choisies, qui partent a l'enregistrement
  existingPhotos = signal<ProductPhoto[]>([]);
  queued = signal<{ file: File; url: string }[]>([]);
  photoCount = computed(() => this.existingPhotos().length + this.queued().length);
  photoBusy = signal(false);

  private dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private pickedCategory = toSignal(this.form.controls.categoryId.valueChanges, { initialValue: '' });
  private pickedUnit = toSignal(this.form.controls.unitId.valueChanges, { initialValue: '' });

  // l'unite choisie : donne le "kg" des libelles du volume et du prix
  private unit = computed(() => this.units().find((u) => u.id === this.pickedUnit()) ?? null);
  volumeLabel = computed(() => (this.unit() ? `Volume estimé (${unitText(this.unit()!.code)})` : 'Volume estimé'));
  priceLabel = computed(() => (this.unit() ? `Prix indicatif (€/${unitText(this.unit()!.code)})` : 'Prix indicatif (€)'));

  // produits a ajouter : tout le catalogue, par categorie (on choisit la categorie, puis le produit). Un produit deja dans la
  // liste reste propose : un producteur a plusieurs varietes du meme produit (Gala, Golden), une ligne chacune. Seule la meme
  // variete deux fois est refusee (voir save, et 409 cote back).
  groups = computed(() => {
    const groups = this.categories()
      .map((category) => ({ id: category.id, name: category.name, products: this.catalog().filter((p) => p.categoryId === category.id) }))
      .filter((group) => group.products.length > 0);
    const orphans = this.catalog().filter((p) => !this.categories().some((c) => c.id === p.categoryId));
    return orphans.length > 0 ? [...groups, { id: OTHERS, name: 'Autres', products: orphans }] : groups;
  });
  // les produits de la categorie choisie
  choices = computed(() => this.groups().find((group) => group.id === this.pickedCategory())?.products ?? []);

  constructor() {
    this.load();
    // la fenetre prend le focus a l'ouverture (clavier, lecteurs d'ecran), comme sur "Mon abonnement"
    effect(() => this.dialog()?.nativeElement.focus());
  }

  // l'interrupteur : on renvoie tous les champs du produit, seul isActive change (labels et periode ne sont pas envoyes :
  // le back les laisse comme ils sont)
  toggle(product: ProducerProduct): void {
    this.busyId.set(product.id);
    this.error.set('');
    this.notice.set('');
    this.service.update(product.id, payloadOf(product, { isActive: !product.isActive })).subscribe({
      next: () => {
        this.busyId.set('');
        this.products.update((list) => list?.map((p) => (p.id === product.id ? { ...p, isActive: !product.isActive } : p)));
      },
      error: (err: HttpErrorResponse) => {
        this.busyId.set('');
        this.error.set(messageOf(err));
      },
    });
  }

  open(target: 'new' | ProducerProduct): void {
    this.notice.set('');
    this.formError.set('');
    this.confirmingDelete.set(false);
    this.clearQueue();
    const existing = target === 'new' ? null : target;
    const slot = existing?.availability ?? null;
    this.form.reset({
      categoryId: '',
      productId: '',
      variety: existing?.variety ?? '',
      description: existing?.description ?? '',
      startMonth: slot?.startMonth ? String(slot.startMonth) : '',
      endMonth: slot?.endMonth ? String(slot.endMonth) : '',
      // un produit d'avant le creneau garde son volume sur la fiche : on le reprend
      volume: plain(slot?.quantity ?? existing?.estimatedVolume ?? null),
      unitId: slot?.unit?.id ?? existing?.unit?.id ?? '',
      price: plain(existing?.defaultPrice ?? null),
      isActive: existing?.isActive ?? true,
    });
    this.chosenLabels.set(existing?.labels.map((label) => label.id) ?? []);
    this.existingPhotos.set(existing?.photos ?? []);
    this.editing.set(target);
  }

  close(): void {
    if (this.saving()) return;
    this.clearQueue();
    this.editing.set(null);
  }

  // changer de categorie vide le produit (et son unite) : il n'est plus dans la liste
  changeCategory(): void {
    this.form.patchValue({ productId: '', unitId: '' });
  }

  // le produit choisi propose son unite par defaut (celle du catalogue), modifiable
  changeProduct(): void {
    const unit = this.catalog().find((p) => p.id === this.form.controls.productId.value)?.unit;
    this.form.controls.unitId.setValue(unit?.id ?? '');
  }

  hasLabel(id: string): boolean {
    return this.chosenLabels().includes(id);
  }

  toggleLabel(id: string): void {
    this.chosenLabels.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  pickFiles(input: HTMLInputElement): void {
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  dropFiles(event: DragEvent): void {
    event.preventDefault();
    this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  unqueue(item: { file: File; url: string }): void {
    URL.revokeObjectURL?.(item.url);
    this.queued.update((list) => list.filter((x) => x !== item));
  }

  // une photo deja enregistree se retire tout de suite (c'est le fichier, pas le formulaire)
  removePhoto(photo: ProductPhoto): void {
    const target = this.editing();
    if (target === null || target === 'new') return;

    this.photoBusy.set(true);
    this.formError.set('');
    this.service.deletePhoto(target.id, photo.id).subscribe({
      next: () => {
        this.photoBusy.set(false);
        this.existingPhotos.update((list) => list.filter((p) => p.id !== photo.id));
        this.products.update((list) => list?.map((p) => (p.id === target.id ? { ...p, photos: p.photos.filter((x) => x.id !== photo.id) } : p)));
      },
      error: (err: HttpErrorResponse) => {
        this.photoBusy.set(false);
        this.formError.set(messageOf(err));
      },
    });
  }

  save(): void {
    const target = this.editing();
    if (target === null) return;

    const value = this.form.getRawValue();
    const volume = toNumber(value.volume);
    const price = toNumber(value.price);
    const start = value.startMonth ? Number(value.startMonth) : null;
    const end = value.endMonth ? Number(value.endMonth) : null;
    if (target === 'new' && !value.productId) {
      this.formError.set('Choisissez un produit.');
      return;
    }
    if ([volume, price].some((n) => n !== null && (Number.isNaN(n) || n < 0))) {
      this.formError.set('Le volume et le prix doivent être des nombres positifs.');
      return;
    }
    if ((start === null) !== (end === null)) {
      this.formError.set('Choisissez le début et la fin de la période.');
      return;
    }
    // la meme variete du meme produit deux fois (casse et espaces ignores, comme le back) : on le dit avant d'envoyer
    const productId = target === 'new' ? value.productId : target.productId;
    const variety = value.variety.trim().toLowerCase();
    const twin = (this.products() ?? []).some(
      (p) => p.productId === productId && p.id !== (target === 'new' ? '' : target.id) && (p.variety ?? '').trim().toLowerCase() === variety,
    );
    if (twin) {
      this.formError.set('Vous avez déjà ce produit avec cette variété : indiquez une autre variété.');
      return;
    }

    const quantity = volume === null ? null : String(Math.round(volume * 1000) / 1000);
    // sans mois ni volume il n'y a pas de periode : tout a null, le back supprime le creneau (l'unite seule ne compte pas)
    const availability: AvailabilityPayload =
      start === null && quantity === null
        ? { startMonth: null, endMonth: null, quantity: null, unitId: null }
        : { startMonth: start, endMonth: end, quantity, unitId: value.unitId || null };
    const fields = {
      variety: value.variety.trim() || null,
      description: value.description.trim() || null,
      isActive: value.isActive,
      // le volume est aussi sur la fiche du produit (ce que lisent la liste et les anciens ecrans), pas seulement dans le creneau
      estimatedVolume: quantity,
      defaultPrice: price === null ? null : String(Math.round(price * 100) / 100),
      currencyCode: price === null ? null : target === 'new' ? 'EUR' : (target.currencyCode ?? 'EUR'),
      labelIds: this.chosenLabels(),
      availability,
    };
    this.run(
      target === 'new'
        ? this.service.create(value.productId, fields).pipe(map((created) => created.id))
        : this.service.update(target.id, payloadOf(target, fields)).pipe(map(() => target.id)),
      target === 'new' ? 'Produit ajouté.' : 'Produit modifié.',
    );
  }

  remove(): void {
    const target = this.editing();
    if (target === null || target === 'new') return;

    // des photos choisies mais pas envoyees n'ont plus de produit ou aller
    this.clearQueue();
    this.run(this.service.remove(target.id).pipe(map(() => target.id)), 'Produit retiré.');
  }

  private addFiles(files: File[]): void {
    this.formError.set('');
    for (const file of files) {
      if (this.photoCount() >= PHOTO_MAX) {
        this.formError.set(`${PHOTO_MAX} photos au maximum par produit.`);
        return;
      }
      if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_BYTES) {
        this.formError.set('Photos : jpeg, png ou webp, 5 Mo maximum chacune.');
        continue;
      }
      this.queued.update((list) => [...list, { file, url: previewOf(file) }]);
    }
  }

  private clearQueue(): void {
    this.queued().forEach((item) => URL.revokeObjectURL?.(item.url));
    this.queued.set([]);
  }

  private load(): void {
    this.service.getProducts().subscribe({
      next: (list) => this.products.set(list),
      error: (err: HttpErrorResponse) => {
        this.products.set(null);
        this.loadError.set(err.error?.error ?? 'Impossible de charger vos produits pour le moment.');
      },
    });
  }

  // enregistre le produit (call rend son identifiant), puis envoie les photos choisies une par une : une photo refusee
  // n'annule pas le produit, on le dit dans la confirmation
  private run(call: Observable<string>, done: string): void {
    this.saving.set(true);
    this.formError.set('');
    call.pipe(switchMap((id) => this.uploadQueued(id))).subscribe({
      next: (failed) => {
        this.saving.set(false);
        this.clearQueue();
        this.editing.set(null);
        this.notice.set(
          failed === 0
            ? done
            : `${done.replace(/\.$/, '')}, mais ${failed === 1 ? "1 photo n'a" : `${failed} photos n'ont`} pas pu être envoyée${failed === 1 ? '' : 's'}.`,
        );
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(messageOf(err));
      },
    });
  }

  // le nombre de photos qui n'ont pas pu partir
  private uploadQueued(productId: string): Observable<number> {
    const files = this.queued().map((item) => item.file);
    if (files.length === 0) return of(0);

    return from(files).pipe(
      concatMap((file) => this.service.uploadPhoto(productId, file).pipe(map(() => 0), catchError(() => of(1)))),
      toArray(),
      map((results) => results.reduce((sum, failed) => sum + failed, 0)),
    );
  }
}
