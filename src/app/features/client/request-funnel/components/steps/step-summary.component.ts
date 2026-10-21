import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { funnelUrl } from '../../funnel-steps';
import { RequestDraftStore } from '../../state/request-draft.store';
import { NEED_OPTIONS } from '../../models/request.model';
import { RequestService, apiErrorMessage } from '../../services/request.service';
import { StepNavComponent } from '../step-nav.component';

@Component({
  selector: 'app-step-summary',
  imports: [RouterLink, StepNavComponent],
  template: `
    <form (submit)="$event.preventDefault(); submit()" class="space-y-5">
      <h2 class="text-base font-bold text-fonts">Récapitulatif</h2>

      <div class="space-y-4 rounded-lg border border-agri/20 bg-badge-bg p-4">
        <dl class="space-y-2 text-sm">
          @for (row of rows(); track row.label) {
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-grey-700">{{ row.label }}</dt>
              <dd class="text-right font-semibold text-fonts">
                {{ row.value }}
                <a [routerLink]="row.editUrl" class="ml-2 text-xs font-normal text-agri underline"
                  >Modifier</a
                >
              </dd>
            </div>
          }
        </dl>

        @if (draft().message; as message) {
          <p
            class="whitespace-pre-line rounded-lg border border-grey-200 bg-white p-3 text-xs text-fonts"
          >
            {{ message }}
          </p>
        }

        <p class="text-xs text-grey-700">
          *Vous ne payez pas le produit sur la plateforme : vous convenez des conditions avec le
          producteur.
        </p>
      </div>

      @if (error(); as message) {
        <p class="text-sm text-danger" role="alert">{{ message }}</p>
      }

      <app-step-nav [prevUrl]="prevUrl" nextLabel="Envoyer la demande" [loading]="submitting()" />
    </form>
  `,
})
export class StepSummaryComponent {
  private readonly store = inject(RequestDraftStore);
  private readonly router = inject(Router);
  private readonly requests = inject(RequestService);

  protected readonly draft = this.store.draft;
  protected readonly prevUrl = funnelUrl(5);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly rows = computed(() => {
    const d = this.draft();
    const need = NEED_OPTIONS.find((o) => o.value === d.needType)?.title ?? '—';
    const date = d.desiredDate
      ? new Date(`${d.desiredDate}T00:00:00`).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '—';
    const modes = [d.pickupWanted && 'Retrait', d.deliveryWanted && 'Livraison']
      .filter(Boolean)
      .join(' et ');

    const rows = [
      { label: 'Catégorie', value: d.categoryLabel ?? '—', editUrl: funnelUrl(1) },
      { label: 'Produit', value: d.productLabel ?? '—', editUrl: funnelUrl(1) },
      { label: 'Besoin', value: need, editUrl: funnelUrl(2) },
      {
        label: 'Quantité',
        value: `${d.quantity ?? ''} ${d.unitLabel ?? ''}`.trim() || '—',
        editUrl: funnelUrl(3),
      },
      { label: 'Date', value: date, editUrl: funnelUrl(3) },
      {
        label: 'Budget indicatif',
        value: d.budgetMax !== null ? `${d.budgetMax} €` : '—',
        editUrl: funnelUrl(3),
      },
      {
        label: 'Localisation',
        value: `${d.city ?? '—'}, rayon ${d.radiusKm} km`,
        editUrl: funnelUrl(4),
      },
      { label: 'Récupération', value: modes, editUrl: funnelUrl(4) },
    ];
    if (d.labels.length)
      rows.push({ label: 'Labels', value: d.labels.join(', '), editUrl: funnelUrl(1) });
    if (d.quality)
      rows.push({ label: 'Préférence qualité', value: d.quality, editUrl: funnelUrl(3) });
    return rows;
  });

  constructor() {
    this.store.step.set(6);
  }

  protected submit(): void {
    if (this.submitting()) return; // évite d'envoyer deux fois la même demande (double clic / Entrée)
    this.submitting.set(true);
    this.error.set(null);

    this.requests.create(this.store.toPayload()).subscribe({
      next: () => {
        this.store.reset();
        this.router.navigateByUrl(funnelUrl('sent'));
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(e));
        this.submitting.set(false);
      },
    });
  }
}
