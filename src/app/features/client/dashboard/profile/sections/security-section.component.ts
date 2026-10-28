import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { apiErrorMessage } from '../api-error';
import { ProfileService } from '../profile.service';
import { UI } from '../ui/ui-classes';

/** Vérifie que "nouveau" et "confirmation" sont identiques (contrôle côté front uniquement). */
export function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('newPassword')?.value === group.get('confirmPassword')?.value
    ? null
    : { mismatch: true };
}

@Component({
  selector: 'app-security-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" [class]="ui.panel + ' space-y-3'" novalidate>
      <div>
        <label for="currentPassword" [class]="ui.label">Mot de passe actuel</label>
        <input
          id="currentPassword"
          type="password"
          autocomplete="current-password"
          formControlName="currentPassword"
          [class]="ui.input"
        />
      </div>
      <div>
        <label for="newPassword" [class]="ui.label">Nouveau mot de passe</label>
        <input
          id="newPassword"
          type="password"
          autocomplete="new-password"
          formControlName="newPassword"
          [class]="ui.input"
        />
        @if (form.controls.newPassword.touched && form.controls.newPassword.hasError('minlength')) {
          <p [class]="ui.error">8 caractères minimum.</p>
        }
      </div>
      <div>
        <label for="confirmPassword" [class]="ui.label">Confirmer le mot de passe</label>
        <input
          id="confirmPassword"
          type="password"
          autocomplete="new-password"
          formControlName="confirmPassword"
          [class]="ui.input"
        />
        @if (form.controls.confirmPassword.touched && form.hasError('mismatch')) {
          <p [class]="ui.error">Les mots de passe ne correspondent pas.</p>
        }
      </div>

      @if (error()) {
        <p role="alert" [class]="ui.error">{{ error() }}</p>
      }
      @if (success()) {
        <p role="status" [class]="ui.success">Mot de passe mis à jour.</p>
      }

      <button type="submit" [class]="ui.primary" [disabled]="saving()">
        Mettre à jour le mot de passe
      </button>
    </form>
  `,
})
export class SecuritySectionComponent {
  private readonly profile = inject(ProfileService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly ui = UI;

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  // ! Garde la même longueur minimale que le backend (ChangePasswordRequest / RegisterClientRequest)
  readonly form = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  submit(): void {
    this.success.set(false);
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // La confirmation n'est pas envoyée : le serveur n'en a pas besoin.
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving.set(true);
    this.profile.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set(true);
        this.form.reset();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Impossible de modifier le mot de passe.'));
      },
    });
  }
}
