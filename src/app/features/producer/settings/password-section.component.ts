import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { messageOf } from '../message-of';
import { SettingsService } from './settings.service';

const INPUT = 'w-full rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm';

// la confirmation est comparee ici : l'API ne la connait pas (elle n'a pas de sens pour un appel direct)
const sameAsNew = (group: AbstractControl): ValidationErrors | null =>
  group.get('newPassword')?.value === group.get('confirmPassword')?.value ? null : { mismatch: true };

// rubrique "Securite" des parametres : changer son mot de passe. Le back redemande le mot de passe actuel, plafonne les essais
// (5 par 15 minutes) et ferme les autres sessions. 12 caracteres au moins, comme a l'inscription.
@Component({
  selector: 'app-password-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './password-section.component.html',
})
export class PasswordSectionComponent {
  private fb = inject(FormBuilder);
  private service = inject(SettingsService);

  readonly input = INPUT;

  form = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(12)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: sameAsNew },
  );

  saving = signal(false);
  notice = signal('');
  error = signal('');

  submit(): void {
    this.notice.set('');
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving.set(true);
    this.service.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.notice.set('Mot de passe mis à jour. Vos autres sessions ont été fermées.');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(messageOf(err));
      },
    });
  }
}
