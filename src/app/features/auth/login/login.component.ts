import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';
import { AuthRoleService } from '../auth-role.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  authRole = inject(AuthRoleService);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  errorMessage: string | null = null;
  isSubmitting = false;

  onSubmit(): void {
    if (this.form.invalid) return;

    this.errorMessage = null;
    this.isSubmitting = true;

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.authService.fetchCurrentUser().subscribe({
          next: () => {
            this.isSubmitting = false;
            this.router.navigate(['/']); // à remplacer par la vraie route de tableau de bord
          },
          error: () => {
            this.isSubmitting = false;
            this.errorMessage = 'Connexion réussie, mais impossible de récupérer votre profil.';
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.handleError(err);
      },
    });
  }

  private handleError(err: HttpErrorResponse): void {
    if (err.status === 401) {
      this.errorMessage = 'Email ou mot de passe incorrect.';
    } else {
      this.errorMessage = 'Une erreur est survenue, réessayez.';
    }
  }
}
