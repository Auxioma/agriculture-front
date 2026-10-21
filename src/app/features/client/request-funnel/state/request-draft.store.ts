import { Injectable, computed, effect, signal } from '@angular/core';
import { CreateRequestPayload, RequestDraft } from '../models/request.model';

const STORAGE_KEY = 'trouvemoi.request-draft';

function emptyDraft(): RequestDraft {
  return {
    categoryId: null,
    categoryLabel: null,
    productId: null,
    customProduct: null,
    productLabel: null,
    labels: [],
    needType: null,
    quantity: null,
    unitId: null,
    unitLabel: null,
    budgetMax: null,
    desiredDate: null,
    quality: null,
    addressText: null,
    city: null,
    postalCode: null,
    latitude: null,
    longitude: null,
    radiusKm: 10,
    pickupWanted: true,
    deliveryWanted: false,
    message: null,
  };
}

/**
 * Store du tunnel : garde les réponses de toutes les étapes dans un signal.
 * Pas de `providedIn: 'root'` : il est fourni par la route parente (request-funnel.routes.ts),
 * donc créé à l'entrée dans le tunnel et détruit à la sortie.
 */
@Injectable()
export class RequestDraftStore {
  readonly draft = signal<RequestDraft>(this.load());
  /** Étape affichée (1 à 6). 0 = pas de pastilles (page « Demande envoyée »). */
  readonly step = signal(1);

  /**
   * Plus grande étape que l'utilisateur a le droit d'ouvrir. Sert au guard : empêche d'arriver
   * directement sur /recapitulatif avec un brouillon vide (ex. lien favori, F5 après reset).
   */
  readonly maxAccessibleStep = computed(() => {
    const d = this.draft();
    if (!d.productId && !d.customProduct) return 1;
    if (!d.needType) return 2;
    if (!d.quantity || d.quantity <= 0 || !d.unitId) return 3;
    if (!d.city || d.latitude === null || d.longitude === null) return 4;
    return 6; // étapes 1-4 valides : message (5) et récapitulatif (6) accessibles
  });

  constructor() {
    // Persiste le brouillon : un rafraîchissement de page ne vide pas le tunnel.
    effect(() => this.save(this.draft()));
  }

  patch(partial: Partial<RequestDraft>): void {
    this.draft.update((d) => ({ ...d, ...partial }));
  }

  reset(): void {
    this.draft.set(emptyDraft());
  }

  /** Transforme le brouillon en JSON attendu par le DTO Symfony. */
  toPayload(): CreateRequestPayload {
    const d = this.draft();
    const str = (n: number | null) => (n === null ? null : String(n));

    return {
      needType: d.needType!, // garanti par le guard d'étape
      categoryId: d.categoryId,
      productId: d.productId,
      customProduct: d.customProduct?.trim() || null,
      quantity: str(d.quantity),
      unitId: d.unitId,
      budgetMin: null, // la maquette n'a qu'un seul champ budget → budgetMax
      budgetMax: str(d.budgetMax),
      desiredDate: d.desiredDate || null, // '' refuserait la désérialisation DateTimeImmutable
      urgencyLevel: 0,
      city: d.city,
      postalCode: d.postalCode,
      latitude: d.latitude,
      longitude: d.longitude,
      radiusKm: String(d.radiusKm),
      pickupWanted: d.pickupWanted,
      deliveryWanted: d.deliveryWanted,
      message: this.composeMessage(d),
    };
  }

  // Provisoire : labels et préférence qualité n'ont pas de champ dans l'API,
  // on les ajoute au message pour que le producteur les voie. À supprimer si l'API les accepte un jour.
  private composeMessage(d: RequestDraft): string | null {
    const parts: string[] = [];
    if (d.labels.length) parts.push(`Labels souhaités : ${d.labels.join(', ')}`);
    if (d.quality?.trim()) parts.push(`Préférence qualité : ${d.quality.trim()}`);
    if (d.message?.trim()) parts.push(d.message.trim());
    return parts.length ? parts.join('\n\n') : null;
  }

  private load(): RequestDraft {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? { ...emptyDraft(), ...JSON.parse(raw) } : emptyDraft();
    } catch {
      return emptyDraft();
    }
  }

  private save(draft: RequestDraft): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* stockage indisponible (navigation privée...) : on continue sans persistance */
    }
  }
}
