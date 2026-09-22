import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  isSubmitting = false;
  isSubmitted = false;
  errorMessage: string | null = null;

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isSubmitting = true;
    this.errorMessage = null;

    this.authService.forgotPassword(this.form.getRawValue()).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.isSubmitted = true;
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        if (err.status === 429) {
          this.errorMessage = 'Trop de tentatives, réessayez plus tard.';
        } else {
          this.errorMessage = 'Une erreur est survenue, réessayez.';
        }
      },
    });
  }
}
