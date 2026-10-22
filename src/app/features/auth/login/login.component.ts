import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthRoleService } from '../auth-role.service';
import { hasProducerRole } from '../../producer/producer-role';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
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
          next: (user) => {
            this.isSubmitting = false;
            this.router.navigateByUrl(this.afterLoginUrl(user.roles));
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

  private afterLoginUrl(roles: string[]): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl?.startsWith('/') && !returnUrl.startsWith('//')) return returnUrl;
    return hasProducerRole(roles) ? '/producer' : '/client';
  }

  private handleError(err: HttpErrorResponse): void {
    if (err.status === 401) {
      this.errorMessage = 'Email ou mot de passe incorrect.';
    } else {
      this.errorMessage = 'Une erreur est survenue, réessayez.';
    }
  }
}
