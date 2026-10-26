import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { messageOf } from '../message-of';
import { longDate } from '../request-format';
import { BADGES, DOCUMENT_TYPES, canAddDocument, documentError, labelDetail, labelKind } from './labels-format';
import { LabelsPage, LabelsService } from './labels.service';

interface Draft {
  on: boolean;
  file: File | null;
}

// "Labels et certifications" semblable au figma : le bandeau du profil verifie, puis un interrupteur par label du catalogue avec
// l'etat de sa verification, et un seul bouton Enregistrer.
//  - declarer un label ne le rend pas visible : il ne devient un badge public qu'une fois le justificatif approuve par l'equipe (back-office).
//  - le justificatif choisi ne part qu'a l'enregistrement, avec la declaration (le label n'existe pas encore chez le serveur).
//  - la date du profil verifie vient de l'audit (cahier : "profil verifie avec date de verification") ; sans trace, on ne l'ecrit pas.
@Component({
  selector: 'app-producer-labels',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './labels.component.html',
})
export class LabelsComponent {
  private service = inject(LabelsService);
  private destroyRef = inject(DestroyRef);

  readonly accept = DOCUMENT_TYPES.join(',');

  // undefined = chargement, null = erreur (back injoignable, compte sans profil producteur...)
  page = signal<LabelsPage | null | undefined>(undefined);
  drafts = signal<Record<string, Draft>>({});
  saving = signal(false);
  notice = signal('');
  error = signal('');

  constructor() {
    this.load();
  }

  verifiedText = computed(() => {
    const at = this.page()?.profile.verifiedAt;

    return at ? `Vérifié le ${longDate(at)} par notre équipe` : 'Vérifié par notre équipe';
  });

  // un label du catalogue avec ce que le serveur en sait (claimed) et ce que le producteur vient de decider (on, file)
  rows = computed(() => {
    const page = this.page();
    if (!page) return [];
    const drafts = this.drafts();

    return page.catalog.map((label) => {
      const claimed = page.claimed.find((c) => c.labelId === label.id);
      const kind = labelKind(claimed);
      const { on, file } = drafts[label.id] ?? { on: claimed !== undefined, file: null };
      const adding = on && !claimed;
      const removing = !on && !!claimed;

      let badge = BADGES[kind];
      let detail = labelDetail(kind, claimed);
      if (adding) {
        badge = { text: 'À enregistrer', style: 'bg-grey-200 text-grey-700' };
        detail = file ? '' : 'Sans justificatif, ce label ne sera pas vérifié';
      } else if (removing) {
        detail = kind === 'declared' || kind === 'rejected' ? 'Sera retiré à l’enregistrement' : 'Sera retiré à l’enregistrement : il devra être vérifié de nouveau si vous le déclarez plus tard';
      }

      return { label, on, file, badge, detail, canAdd: canAddDocument(kind) };
    });
  });

  toggle(id: string): void {
    this.drafts.update((drafts) => {
      const on = !drafts[id]?.on;
      // un justificatif choisi n'a plus de raison d'etre si on decoche
      return { ...drafts, [id]: { on, file: on ? (drafts[id]?.file ?? null) : null } };
    });
  }

  // "Ajouter un justificatif" declare aussi le label : c'est ce que le figma fait d'un label « Non declare »
  chooseFile(id: string, input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const problem = documentError(file);
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.error.set('');
    this.drafts.update((drafts) => ({ ...drafts, [id]: { on: true, file } }));
  }

  removeFile(id: string): void {
    this.drafts.update((drafts) => ({ ...drafts, [id]: { on: drafts[id]?.on ?? false, file: null } }));
  }

  save(): void {
    this.notice.set('');
    this.error.set('');
    this.saving.set(true);
    this.service
      .save(this.rows().map(({ label, on, file }) => ({ label, on, file })))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notice.set('Déclarations enregistrées.');
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.error.set(messageOf(err));
        },
      });
  }

  private load(): void {
    this.service
      .getPage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.page.set(page);
          // chaque label repart de ce qui est declare chez le serveur, sans justificatif en attente d'envoi
          const claimed = new Set(page.claimed.map((c) => c.labelId));
          this.drafts.set(Object.fromEntries(page.catalog.map((label) => [label.id, { on: claimed.has(label.id), file: null }])));
        },
        error: () => this.page.set(null),
      });
  }
}
