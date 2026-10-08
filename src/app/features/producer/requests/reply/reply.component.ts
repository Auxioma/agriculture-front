import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, tap } from 'rxjs';
import { requestQuantity, unitLabel } from '../../request-format';
import { ReplyDraft, ReplyPayload, RequestsService } from '../requests.service';

const INPUT = 'w-full rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm placeholder:text-grey-500';

// "12,5" ou "12.5" -> nombre, NaN si ce n'est pas un nombre
const toNumber = (value: string): number => (value.trim() === '' ? NaN : Number(value.trim().replace(',', '.')));

// page "Repondre a la demande" branchee sur POST /api/producer/requests/{id}/reply : "Envoyer la
// reponse" l'envoie au client, "Enregistrer le brouillon" la garde pour plus tard (le brouillon est repris a la
// prochaine ouverture). Les exemples en gris viennent de la demande (budget, quantite, retrait...). La devise est
// toujours l'euro. 
// ! "Joindre un devis ou une photo" est desactive : le back n'a pas de route pour envoyer un fichier
// ! avec une reponse.


@Component({
  selector: 'app-producer-reply',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reply.component.html',
})
export class ReplyComponent {
  private fb = inject(FormBuilder);
  private service = inject(RequestsService);
  private router = inject(Router);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  readonly input = INPUT;
  form = this.fb.nonNullable.group({
    price: '',
    unitId: '',
    quantity: '',
    date: '',
    validityDays: '',
    pickup: '',
    delivery: '',
    message: '',
  });
  error = signal('');
  info = signal('');
  sending = signal(false);

  // undefined = chargement, null = erreur (demande inconnue ou pas proposee a ce producteur...)
  request = toSignal(
    this.service.getDetail(this.id).pipe(
      tap((request) => this.prefill(request.draft)),
      catchError(() => of(null)),
    ),
  );
  units = toSignal(this.service.getUnits().pipe(catchError(() => of([]))), { initialValue: [] });

  // ex. "€ / kg"
  unitText(code: string | null): string {
    return code ? `€ / ${unitLabel({ unit: code, quantity: null })}` : 'Unité';
  }

  readonly requestQuantity = requestQuantity;

  priceHint(): string {
    const budget = this.request()?.budgetMax;
    return budget === null || budget === undefined ? 'Prix' : String(budget);
  }

  quantityHint(): string {
    const request = this.request();
    return request && request.quantity !== null ? requestQuantity(request, true) : 'Quantité';
  }

  submit(draft: boolean): void {
    const payload = this.payload(draft);
    const problem = payload ? this.problem(payload, draft) : 'Vérifiez les nombres saisis (prix, quantité, validité).';
    this.info.set('');
    this.error.set(problem ?? '');
    if (!payload || problem) return;

    this.sending.set(true);
    this.service.sendReply(this.id, payload).subscribe({
      next: () => {
        this.sending.set(false);
        if (draft) this.info.set('Brouillon enregistré.');
        else this.router.navigate(['/producer/requests', this.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.sending.set(false);
        this.error.set(err.error?.error ?? "Impossible d'envoyer la réponse pour le moment.");
      },
    });
  }

  // reprend ce que le producteur avait deja saisi (validite : nombre de jours restants jusqu'a la date enregistree)
  private prefill(draft: ReplyDraft | null): void {
    if (!draft) return;
    const days = draft.validUntil ? Math.ceil((new Date(draft.validUntil).getTime() - Date.now()) / 86_400_000) : 0;
    this.form.patchValue({
      price: draft.priceAmount?.toString() ?? '',
      unitId: draft.priceUnitId ?? '',
      quantity: draft.availableQuantity?.toString() ?? '',
      date: draft.availabilityDate?.slice(0, 10) ?? '',
      validityDays: days > 0 ? String(days) : '',
      pickup: draft.pickupConditions ?? '',
      delivery: draft.deliveryConditions ?? '',
      message: draft.replyText ?? '',
    });
  }

  // null si un nombre saisi n'en est pas un
  private payload(draft: boolean): ReplyPayload | null {
    const v = this.form.getRawValue();
    const price = toNumber(v.price);
    const quantity = toNumber(v.quantity);
    const days = toNumber(v.validityDays);
    // un champ rempli doit etre un bon nombre (NaN >= 0 est faux, un texte est donc refuse)
    const bad = (value: string, ok: boolean) => value.trim() !== '' && !ok;
    if (bad(v.price, price >= 0) || bad(v.quantity, quantity >= 0) || bad(v.validityDays, Number.isInteger(days) && days >= 1 && days <= 365)) {
      return null;
    }

    return {
      draft,
      replyText: v.message.trim() || null,
      priceAmount: v.price.trim() ? String(price) : null,
      priceUnitId: v.unitId || null,
      currencyCode: v.price.trim() ? 'EUR' : null,
      availableQuantity: v.quantity.trim() ? String(quantity) : null,
      availabilityDate: v.date || null,
      // date locale au format AAAA-MM-JJ (le format suedois), aujourd'hui + le nombre de jours choisi
      validUntil: v.validityDays.trim() ? new Date(Date.now() + days * 86_400_000).toLocaleDateString('sv-SE') : null,
      pickupConditions: v.pickup.trim() || null,
      deliveryConditions: v.delivery.trim() || null,
    };
  }

  // une reponse envoyee doit avoir au moins un prix ou un message (regle du back), un brouillon peut etre vide
  private problem(payload: ReplyPayload, draft: boolean): string | null {
    return !draft && !payload.priceAmount && !payload.replyText ? 'Indiquez un prix ou un message.' : null;
  }
}
