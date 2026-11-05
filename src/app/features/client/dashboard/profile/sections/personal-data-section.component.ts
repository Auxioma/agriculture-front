import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { apiErrorMessage } from '../api-error';
import { ProfileService } from '../profile.service';
import { UI } from '../ui/ui-classes';

@Component({
  selector: 'app-personal-data-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="ui.panel + ' space-y-3'">
      <p class="text-xs text-grey-700">
        Vous pouvez exporter ou supprimer vos données personnelles à tout moment (RGPD).
      </p>

      <button type="button" [class]="ui.secondary" [disabled]="busy()" (click)="exportData()">
        Exporter mes données
      </button>

      @if (!confirming()) {
        <div>
          <button
            type="button"
            class="cursor-pointer text-xs font-medium text-danger"
            (click)="confirming.set(true)"
          >
            Supprimer mon compte
          </button>
        </div>
      } @else {
        <div
          role="alertdialog"
          aria-label="Confirmer la suppression"
          class="space-y-2 rounded-lg bg-red-50 p-3"
        >
          <p class="text-xs text-danger">
            Cette action est définitive : votre compte sera anonymisé. Continuer ?
          </p>
          <div class="flex gap-2">
            <button
              type="button"
              class="cursor-pointer rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              [disabled]="busy()"
              (click)="deleteAccount()"
            >
              Oui, supprimer
            </button>
            <button type="button" [class]="ui.secondary" (click)="confirming.set(false)">
              Annuler
            </button>
          </div>
        </div>
      }

      @if (error()) {
        <p role="alert" [class]="ui.error">{{ error() }}</p>
      }
    </div>
  `,
})
export class PersonalDataSectionComponent {
  private readonly profile = inject(ProfileService);
  private readonly document = inject(DOCUMENT);
  protected readonly ui = UI;

  /** Émis quand le compte est supprimé : le parent s'occupe de déconnecter et rediriger. */
  readonly deleted = output<void>();

  readonly confirming = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  exportData(): void {
    this.error.set(null);
    this.busy.set(true);
    this.profile.exportData().subscribe({
      next: (data) => {
        this.busy.set(false);
        this.download(data);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(err, "Impossible d'exporter vos données."));
      },
    });
  }

  deleteAccount(): void {
    this.error.set(null);
    this.busy.set(true);
    this.profile.deleteAccount().subscribe({
      next: () => {
        this.busy.set(false);
        this.deleted.emit();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(err, 'Suppression impossible.'));
      },
    });
  }

  /** Crée un fichier JSON en mémoire (Blob) et déclenche son téléchargement. */
  private download(data: unknown): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = 'trouvemoi-mes-donnees.json';
    link.click();
    URL.revokeObjectURL(url);
  }
}
