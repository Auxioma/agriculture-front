import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let component: ForgotPasswordComponent;
  let authServiceMock: { forgotPassword: ReturnType<typeof vi.fn> };
  let cdr: ChangeDetectorRef;

  // Défensif : ces composants mutent des propriétés brutes (isSubmitted, errorMessage).
  // Si le composant est OnPush, markForCheck() est indispensable ; sinon il est inoffensif.
  async function detectChangesForced(): Promise<void> {
    cdr.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    authServiceMock = { forgotPassword: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [{ provide: AuthService, useValue: authServiceMock }, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    fixture.detectChanges();
  });

  it('devrait se créer', () => {
    expect(component).toBeTruthy();
  });

  describe('validation du formulaire', () => {
    it("devrait être invalide quand l'email est vide", () => {
      expect(component.form.invalid).toBe(true);
    });

    it('devrait être invalide avec un email mal formé', () => {
      component.form.controls.email.setValue('pas-un-email');
      expect(component.form.invalid).toBe(true);
    });

    it('devrait être valide avec un email correct', () => {
      component.form.controls.email.setValue('test@test.com');
      expect(component.form.valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      component.form.controls.email.setValue('test@test.com');
    });

    it('ne devrait rien faire si le formulaire est invalide', () => {
      component.form.controls.email.setValue('');

      component.onSubmit();

      expect(authServiceMock.forgotPassword).not.toHaveBeenCalled();
    });

    it("devrait appeler forgotPassword() avec l'email et passer isSubmitted à true", () => {
      authServiceMock.forgotPassword.mockReturnValue(of(undefined));

      component.onSubmit();

      expect(authServiceMock.forgotPassword).toHaveBeenCalledWith({ email: 'test@test.com' });
      expect(component.isSubmitted).toBe(true);
      expect(component.isSubmitting).toBe(false);
      expect(component.errorMessage).toBeNull();
    });

    it('devrait afficher un message dédié pour une erreur 429', () => {
      authServiceMock.forgotPassword.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 429 })),
      );

      component.onSubmit();

      expect(component.errorMessage).toBe('Trop de tentatives, réessayez plus tard.');
      expect(component.isSubmitted).toBe(false);
      expect(component.isSubmitting).toBe(false);
    });

    it('devrait afficher un message générique pour toute autre erreur', () => {
      authServiceMock.forgotPassword.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      component.onSubmit();

      expect(component.errorMessage).toBe('Une erreur est survenue, réessayez.');
      expect(component.isSubmitted).toBe(false);
    });
  });

  describe('rendu du template', () => {
    it('devrait afficher le formulaire, pas la confirmation, au départ', () => {
      const text: string = fixture.nativeElement.textContent;

      expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
      expect(text).not.toContain('Si un compte existe');
    });

    it('devrait afficher la confirmation neutre (anti-énumération) après envoi', async () => {
      component.isSubmitted = true;
      await detectChangesForced();

      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Si un compte existe');
    });

    it("devrait afficher le message d'erreur dans le DOM", async () => {
      component.errorMessage = 'Trop de tentatives, réessayez plus tard.';
      await detectChangesForced();

      expect(fixture.nativeElement.textContent).toContain(
        'Trop de tentatives, réessayez plus tard.',
      );
    });

    it('devrait désactiver le bouton tant que le formulaire est invalide', () => {
      const button: HTMLButtonElement =
        fixture.nativeElement.querySelector('button[type="submit"]');
      expect(button.disabled).toBe(true);
    });
  });
});
