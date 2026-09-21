import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';
import { AuthRoleService } from '../auth-role.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  authRole = inject(AuthRoleService);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(12)]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    // champs producteur — ajoutés/retirés dynamiquement selon this.role()
    farmName: [''],
    countryCode: [''],
  });

  errorMessage: string | null = null;

  onSubmit(): void {
    if (this.form.invalid) return;

    const { email, password, firstName, lastName, farmName, countryCode } = this.form.getRawValue();
    this.errorMessage = null;

    const call$ =
      this.authRole.role() === 'client'
        ? this.authService.registerClient({ email, password, firstName, lastName })
        : this.authService.registerProducer({
            email,
            password,
            firstName,
            lastName,
            farmName,
            countryCode,
          });

    call$.subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  private handleError(err: HttpErrorResponse): void {
    if (err.status === 409) {
      this.errorMessage = err.error.error;
    } else if (err.status === 422) {
      this.errorMessage = err.error.error ?? 'Données invalides.';
    } else {
      this.errorMessage = 'Une erreur est survenue, réessayez.';
    }
  }
}
