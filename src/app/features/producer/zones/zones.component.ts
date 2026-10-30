import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, catchError, of } from 'rxjs';
import { messageOf } from '../message-of';
import { kmText, parseKm } from '../profile/profile-format';
import { ProfileZone } from '../profile/profile.service';
import { amountField, buildRules, byRadius, conditions, parseAmount, zoneTitle } from './zones-format';
import { ZonesService } from './zones.service';

// page "Zones de vente" (cahier fonctionnel, dashboard producteur), branchee sur /api/producer/delivery-zones. Pas de maquette :
// elle suit les autres pages du producteur. Une zone = un rayon en km autour de la ferme, avec ses conditions facultatives (frais de
// livraison, commande minimum). La fiche publique n'affiche que la plus grande, c'est aussi le "Rayon de vente" de "Modifier mon
// profil". Le contour dessine a la main (polygone) n'est pas gere ici : le back sait le garder, rien dans l'interface n'en cree.
@Component({
  selector: 'app-producer-zones',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './zones.component.html',
})
export class ZonesComponent {
  private service = inject(ZonesService);

  // undefined = chargement, null = erreur (back injoignable, compte sans profil producteur...)
  zones = signal<ProfileZone[] | null | undefined>(undefined);
  sorted = computed(() => [...(this.zones() ?? [])].sort(byRadius));

  // 'new' = ajout d'une zone, sinon l'id de la zone en cours de modification
  editing = signal<string | null>(null);
  radius = signal('');
  fee = signal('');
  minimum = signal('');
  confirmingDelete = signal<string | null>(null);
  busy = signal(false);
  error = signal('');
  notice = signal('');

  constructor() {
    this.service
      .list()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(),
      )
      .subscribe((zones) => this.zones.set(zones));
  }

  readonly title = zoneTitle;
  readonly conditions = conditions;

  add(): void {
    this.open('new', '', '', '');
  }

  edit(zone: ProfileZone): void {
    this.open(zone.id, kmText(Number(zone.radiusKm)), amountField(zone, 'fee'), amountField(zone, 'minimum'));
  }

  cancel(): void {
    this.editing.set(null);
    this.error.set('');
  }

  save(): void {
    if (this.busy()) return;

    const km = parseKm(this.radius());
    const fee = parseAmount(this.fee());
    const minimum = parseAmount(this.minimum());
    if (km === null || !Number.isFinite(km) || km <= 0) return this.error.set('Rayon : indiquez un nombre de kilomètres supérieur à 0.');
    if (Number.isNaN(fee)) return this.error.set('Frais de livraison : indiquez un montant, par exemple 3,50, ou laissez vide.');
    if (Number.isNaN(minimum)) return this.error.set('Commande minimum : indiquez un montant, par exemple 20, ou laissez vide.');

    const id = this.editing();
    const existing = this.zones()?.find((zone) => zone.id === id);
    const payload = { radiusKm: km, rules: buildRules(existing?.rules ?? null, fee, minimum) };
    const call = id === 'new' || !existing ? this.service.create(payload) : this.service.update(existing.id, payload);

    this.run(call, (zone) => {
      this.zones.update((zones) => (existing ? (zones ?? []).map((z) => (z.id === zone.id ? zone : z)) : [...(zones ?? []), zone]));
      this.editing.set(null);
      this.notice.set(existing ? 'Zone enregistrée.' : 'Zone ajoutée.');
    });
  }

  askDelete(zone: ProfileZone): void {
    this.editing.set(null);
    this.confirmingDelete.set(zone.id);
    this.error.set('');
  }

  remove(zone: ProfileZone): void {
    if (this.busy()) return;

    this.run(this.service.remove(zone.id), () => {
      this.zones.update((zones) => (zones ?? []).filter((z) => z.id !== zone.id));
      this.confirmingDelete.set(null);
      this.notice.set('Zone supprimée.');
    });
  }

  private open(id: string, radius: string, fee: string, minimum: string): void {
    this.editing.set(id);
    this.confirmingDelete.set(null);
    this.radius.set(radius);
    this.fee.set(fee);
    this.minimum.set(minimum);
    this.error.set('');
    this.notice.set('');
  }

  // un appel a la fois ; en cas de refus le formulaire reste ouvert avec ce qui a ete saisi
  private run<T>(call: Observable<T>, done: (result: T) => void): void {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    call.subscribe({
      next: (result) => {
        this.busy.set(false);
        done(result);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(messageOf(err));
      },
    });
  }
}
