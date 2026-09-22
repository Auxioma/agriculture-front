import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return newPassword === confirmPassword ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private token = '';
  tokenMissing = false;

  form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(12)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  isSubmitting = false;
  errorMessage: string | null = null;

  constructor() {
    const tokenFromUrl = this.route.snapshot.queryParamMap.get('token');
    if (tokenFromUrl) {
      this.token = tokenFromUrl;
    } else {
      this.tokenMissing = true;
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.tokenMissing) return;

    this.isSubmitting = true;
    this.errorMessage = null;

    this.authService
      .resetPassword({
        token: this.token,
        newPassword: this.form.getRawValue().newPassword,
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/auth/login']);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting = false;
          this.errorMessage =
            err.status === 422 ? 'Lien invalide ou expiré' : 'Une erreur est survenue, réessayez';
        },
      });
  }
}
