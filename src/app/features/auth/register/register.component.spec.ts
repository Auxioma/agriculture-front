import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthRoleService } from '../auth-role.service';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let authServiceMock: {
    registerClient: ReturnType<typeof vi.fn>;
    registerProducer: ReturnType<typeof vi.fn>;
  };
  let authRoleService: AuthRoleService;
  let routerNavigateSpy: ReturnType<typeof vi.spyOn>;
  let cdr: ChangeDetectorRef;

  async function detectChangesForced(): Promise<void> {
    cdr.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    authServiceMock = {
      registerClient: vi.fn(),
      registerProducer: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: AuthRoleService, useClass: AuthRoleService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    authRoleService = TestBed.inject(AuthRoleService);

    const router = TestBed.inject(Router);
    routerNavigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    fixture.detectChanges();
  });

  it('devrait se créer', () => {
    expect(component).toBeTruthy();
  });

  describe('validation du formulaire', () => {
    it('devrait être invalide quand les champs communs sont vides', () => {
      expect(component.form.invalid).toBe(true);
    });

    it('devrait être invalide si le mot de passe fait moins de 12 caractères', () => {
      component.form.controls.firstName.setValue('Jean');
      component.form.controls.lastName.setValue('Dupont');
      component.form.controls.email.setValue('jean@test.com');
      component.form.controls.password.setValue('court1234'); // 9 caractères

      expect(component.form.invalid).toBe(true);
    });

    it('devrait être valide pour un client avec seulement les champs communs', () => {
      component.form.controls.firstName.setValue('Jean');
      component.form.controls.lastName.setValue('Dupont');
      component.form.controls.email.setValue('jean@test.com');
      component.form.controls.password.setValue('password1234');

      expect(component.form.valid).toBe(true);
    });

    it('devrait devenir invalide pour un producteur sans farmName/countryCode', () => {
      component.form.controls.firstName.setValue('Jean');
      component.form.controls.lastName.setValue('Dupont');
      component.form.controls.email.setValue('jean@test.com');
      component.form.controls.password.setValue('password1234');

      authRoleService.selectRole('producer');
      fixture.detectChanges();

      expect(component.form.invalid).toBe(true);
    });

    it('devrait redevenir valide pour un producteur une fois farmName/countryCode renseignés', () => {
      component.form.controls.firstName.setValue('Jean');
      component.form.controls.lastName.setValue('Dupont');
      component.form.controls.email.setValue('jean@test.com');
      component.form.controls.password.setValue('password1234');

      authRoleService.selectRole('producer');
      fixture.detectChanges();
      component.form.controls.farmName.setValue('Ferme du Soleil');
      component.form.controls.countryCode.setValue('FR');

      expect(component.form.valid).toBe(true);
    });

    it('devrait retirer les validators producteur en revenant à "client"', () => {
      component.form.controls.firstName.setValue('Jean');
      component.form.controls.lastName.setValue('Dupont');
      component.form.controls.email.setValue('jean@test.com');
      component.form.controls.password.setValue('password1234');

      authRoleService.selectRole('producer');
      fixture.detectChanges();
      authRoleService.selectRole('client');
      fixture.detectChanges();

      expect(component.form.valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      component.form.controls.firstName.setValue('Jean');
      component.form.controls.lastName.setValue('Dupont');
      component.form.controls.email.setValue('jean@test.com');
      component.form.controls.password.setValue('password1234');
    });

    it('ne devrait rien faire si le formulaire est invalide', () => {
      component.form.controls.email.setValue('');

      component.onSubmit();

      expect(authServiceMock.registerClient).not.toHaveBeenCalled();
      expect(authServiceMock.registerProducer).not.toHaveBeenCalled();
    });

    it('devrait appeler registerClient() avec le bon payload et naviguer vers /auth/login', () => {
      authServiceMock.registerClient.mockReturnValue(of({ id: 'user-1' }));

      component.onSubmit();

      expect(authServiceMock.registerClient).toHaveBeenCalledWith({
        email: 'jean@test.com',
        password: 'password1234',
        firstName: 'Jean',
        lastName: 'Dupont',
      });
      expect(authServiceMock.registerProducer).not.toHaveBeenCalled();
      expect(routerNavigateSpy).toHaveBeenCalledWith(['/auth/login']);
    });

    it('devrait appeler registerProducer() avec le bon payload quand le rôle est producer', () => {
      authRoleService.selectRole('producer');
      fixture.detectChanges();
      component.form.controls.farmName.setValue('Ferme du Soleil');
      component.form.controls.countryCode.setValue('FR');
      authServiceMock.registerProducer.mockReturnValue(of({ id: 'user-2' }));

      component.onSubmit();

      expect(authServiceMock.registerProducer).toHaveBeenCalledWith({
        email: 'jean@test.com',
        password: 'password1234',
        firstName: 'Jean',
        lastName: 'Dupont',
        farmName: 'Ferme du Soleil',
        countryCode: 'FR',
      });
      expect(authServiceMock.registerClient).not.toHaveBeenCalled();
    });

    it('devrait afficher une erreur 409 (email déjà utilisé)', () => {
      authServiceMock.registerClient.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { error: 'Un compte existe déjà avec cet email.' },
            }),
        ),
      );

      component.onSubmit();

      expect(component.errorMessage).toBe('Un compte existe déjà avec cet email.');
      expect(routerNavigateSpy).not.toHaveBeenCalled();
    });

    it('devrait afficher une erreur 422 (pays inconnu)', () => {
      authRoleService.selectRole('producer');
      fixture.detectChanges();
      component.form.controls.farmName.setValue('Ferme du Soleil');
      component.form.controls.countryCode.setValue('XX');
      authServiceMock.registerProducer.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 422, error: { error: 'Pays inconnu.' } })),
      );

      component.onSubmit();

      expect(component.errorMessage).toBe('Pays inconnu.');
    });

    it('devrait afficher un message générique pour toute autre erreur', () => {
      authServiceMock.registerClient.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      component.onSubmit();

      expect(component.errorMessage).toBe('Une erreur est survenue, réessayez.');
    });
  });

  describe('rendu du template', () => {
    it('devrait afficher les champs producteur uniquement quand le rôle est producer', async () => {
      let farmNameInput = fixture.nativeElement.querySelector('input[formcontrolname="farmName"]');
      expect(farmNameInput).toBeNull();

      authRoleService.selectRole('producer');
      fixture.detectChanges();
      await fixture.whenStable();

      farmNameInput = fixture.nativeElement.querySelector('input[formcontrolname="farmName"]');
      expect(farmNameInput).not.toBeNull();
    });

    it("devrait afficher le message d'erreur dans le DOM", async () => {
      component.errorMessage = 'Un compte existe déjà avec cet email.';
      await detectChangesForced();

      const errorEl: HTMLElement = fixture.nativeElement.querySelector('.form-error');
      expect(errorEl?.textContent).toContain('Un compte existe déjà avec cet email.');
    });

    it('devrait désactiver le bouton si le formulaire est invalide', () => {
      const button: HTMLButtonElement =
        fixture.nativeElement.querySelector('button[type="submit"]');
      expect(button.disabled).toBe(true);
    });
  });
});
