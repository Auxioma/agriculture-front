import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, it, expect, vi } from 'vitest';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let component: ResetPasswordComponent;
  let authServiceMock: { resetPassword: ReturnType<typeof vi.fn> };
  let routerNavigateSpy: ReturnType<typeof vi.spyOn>;
  let cdr: ChangeDetectorRef;

  async function detectChangesForced(): Promise<void> {
    cdr.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function setup(token?: string): Promise<void> {
    authServiceMock = { resetPassword: vi.fn() };

    const providers: unknown[] = [
      { provide: AuthService, useValue: authServiceMock },
      provideRouter([]),
    ];

    // Sans token : on garde le vrai ActivatedRoute (query params vides), car le template
    // affiche alors un routerLink qui a besoin d'un ActivatedRoute complet et fonctionnel.
    if (token) {
      providers.push({
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap({ token }) } },
      });
    }

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: providers as never[],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;

    const router = TestBed.inject(Router);
    routerNavigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    fixture.detectChanges();
  }

  describe("sans token dans l'URL", () => {
    it('devrait marquer le lien comme invalide et masquer le formulaire', async () => {
      await setup();

      expect(component.tokenMissing).toBe(true);
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('invalide ou incomplet');
    });

    it('ne devrait pas appeler resetPassword() même si onSubmit() est déclenché', async () => {
      await setup();
      component.form.controls.newPassword.setValue('nouveauMotDePasse1234');
      component.form.controls.confirmPassword.setValue('nouveauMotDePasse1234');

      component.onSubmit();

      expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe("avec un token dans l'URL", () => {
    it('devrait se créer et afficher le formulaire', async () => {
      await setup('abc123');

      expect(component).toBeTruthy();
      expect(component.tokenMissing).toBe(false);
      expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    });

    describe('validation du formulaire', () => {
      it('devrait être invalide quand les champs sont vides', async () => {
        await setup('abc123');
        expect(component.form.invalid).toBe(true);
      });

      it('devrait être invalide si les deux mots de passe ne correspondent pas', async () => {
        await setup('abc123');
        component.form.controls.newPassword.setValue('nouveauMotDePasse1234');
        component.form.controls.confirmPassword.setValue('autreMotDePasse5678');

        expect(component.form.invalid).toBe(true);
        expect(component.form.errors?.['passwordsMismatch']).toBe(true);
      });

      it('devrait être valide si les deux mots de passe correspondent', async () => {
        await setup('abc123');
        component.form.controls.newPassword.setValue('nouveauMotDePasse1234');
        component.form.controls.confirmPassword.setValue('nouveauMotDePasse1234');

        expect(component.form.valid).toBe(true);
      });
    });

    describe('onSubmit', () => {
      async function setupValidForm(): Promise<void> {
        await setup('abc123');
        component.form.controls.newPassword.setValue('nouveauMotDePasse1234');
        component.form.controls.confirmPassword.setValue('nouveauMotDePasse1234');
      }

      it('ne devrait rien faire si le formulaire est invalide', async () => {
        await setup('abc123');

        component.onSubmit();

        expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
      });

      it("devrait envoyer le token de l'URL et le nouveau mot de passe, sans confirmPassword", async () => {
        await setupValidForm();
        authServiceMock.resetPassword.mockReturnValue(of(undefined));

        component.onSubmit();

        expect(authServiceMock.resetPassword).toHaveBeenCalledWith({
          token: 'abc123',
          newPassword: 'nouveauMotDePasse1234',
        });
      });

      it('devrait naviguer vers /auth/login en cas de succès', async () => {
        await setupValidForm();
        authServiceMock.resetPassword.mockReturnValue(of(undefined));

        component.onSubmit();

        expect(routerNavigateSpy).toHaveBeenCalledWith(['/auth/login']);
        expect(component.isSubmitting).toBe(false);
      });

      it('devrait afficher "Lien invalide ou expiré." pour une erreur 422', async () => {
        await setupValidForm();
        authServiceMock.resetPassword.mockReturnValue(
          throwError(() => new HttpErrorResponse({ status: 422 })),
        );

        component.onSubmit();

        expect(component.errorMessage).toBe('Lien invalide ou expiré.');
        expect(routerNavigateSpy).not.toHaveBeenCalled();
        expect(component.isSubmitting).toBe(false);
      });

      it('devrait afficher un message générique pour toute autre erreur', async () => {
        await setupValidForm();
        authServiceMock.resetPassword.mockReturnValue(
          throwError(() => new HttpErrorResponse({ status: 500 })),
        );

        component.onSubmit();

        expect(component.errorMessage).toBe('Une erreur est survenue, réessayez.');
      });
    });

    describe('rendu du template', () => {
      it("devrait afficher le message d'erreur dans le DOM", async () => {
        await setup('abc123');
        component.errorMessage = 'Lien invalide ou expiré.';
        await detectChangesForced();

        expect(fixture.nativeElement.textContent).toContain('Lien invalide ou expiré.');
      });

      it('devrait désactiver le bouton tant que le formulaire est invalide', async () => {
        await setup('abc123');

        const button: HTMLButtonElement =
          fixture.nativeElement.querySelector('button[type="submit"]');
        expect(button.disabled).toBe(true);
      });
    });
  });
});
