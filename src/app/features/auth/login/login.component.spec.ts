import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthRoleService } from '../auth-role.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authServiceMock: {
    login: ReturnType<typeof vi.fn>;
    fetchCurrentUser: ReturnType<typeof vi.fn>;
  };
  let routerNavigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    authServiceMock = {
      login: vi.fn(),
      fetchCurrentUser: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: AuthRoleService, useClass: AuthRoleService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;

    const router = TestBed.inject(Router);
    routerNavigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  it('devrait se créer', () => {
    expect(component).toBeTruthy();
  });

  describe('validation du formulaire', () => {
    it('devrait être invalide quand les champs sont vides', () => {
      expect(component.form.invalid).toBe(true);
    });

    it('devrait être invalide avec un email mal formé', () => {
      component.form.controls.email.setValue('pas-un-email');
      component.form.controls.password.setValue('password1234');

      expect(component.form.invalid).toBe(true);
    });

    it('devrait être valide avec un email et mot de passe rensaignés', () => {
      component.form.controls.email.setValue('test@test.com');
      component.form.controls.password.setValue('password1234');

      expect(component.form.valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      component.form.controls.email.setValue('test@test.com');
      component.form.controls.password.setValue('password1234');
    });

    it('ne devrait rien faire si le formulaire est invalide', () => {
      component.form.controls.email.setValue('');

      component.onSubmit();

      expect(authServiceMock.login).not.toHaveBeenCalled();
    });

    it('devrait appeler login() puis fetchCurrentUser() et naviguer vers / en cas de succès', () => {
      authServiceMock.login.mockReturnValue(of({ token: 'fake-jwt' }));
      authServiceMock.fetchCurrentUser.mockReturnValue(
        of({
          id: '1',
          email: 'test@test.com',
          password: 'password1234',
          firstName: 'Test',
          lastName: 'User',
          roles: ['ROLE_CLIENT'],
        }),
      );

      component.onSubmit();

      expect(authServiceMock.login).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password1234',
      });
      expect(authServiceMock.fetchCurrentUser).toHaveBeenCalled();
      expect(routerNavigateSpy).toHaveBeenCalledWith(['/']);
      expect(component.isSubmitting).toBe(false);
      expect(component.errorMessage).toBeNull();
    });

    it('devrait afficher une erreur 401 sans naviguer', () => {
      authServiceMock.login.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 401 })),
      );

      component.onSubmit();

      expect(component.errorMessage).toBe('Email ou mot de passe incorrect.');
      expect(routerNavigateSpy).not.toHaveBeenCalled();
      expect(component.isSubmitting).toBe(false);
    });

    it('devrait afficher un message générique pour toute autre erreur', () => {
      authServiceMock.login.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      component.onSubmit();

      expect(component.errorMessage).toBe('Une erreur est survenue, réessayez.');
    });

    it('devrait afficher un message dédié si login réussit mais fetchCurrentUser échoue', () => {
      authServiceMock.login.mockReturnValue(of({ token: 'fake-jwt' }));
      authServiceMock.fetchCurrentUser.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      component.onSubmit();

      expect(component.errorMessage).toBe(
        'Connexion réussie, mais impossible de récupérer votre profil.',
      );
      expect(routerNavigateSpy).not.toHaveBeenCalled();
      expect(component.isSubmitting).toBe(false);
    });

    it('devrait passer isSubmitting à true pendant la requête, puis à false une fois terminée', () => {
      vi.useFakeTimers();

      authServiceMock.login.mockReturnValue(
        new Observable<{ token: string }>((subscriber) => {
          setTimeout(() => {
            subscriber.next({ token: 'fake-jwt' });
            subscriber.complete();
          }, 10);
        }),
      );
      authServiceMock.fetchCurrentUser.mockReturnValue(
        of({ id: '1', email: 'test@test.com', firstName: 'Test', lastName: 'User', roles: [] }),
      );

      component.onSubmit();
      expect(component.isSubmitting).toBe(true);

      vi.advanceTimersByTime(10); // avance le temps simulé de 10ms, sans attente réelle

      expect(component.isSubmitting).toBe(false);

      vi.useRealTimers(); // remet les vrais timers pour ne pas affecter les tests suivants
    });
  });

  describe('rendu du template', () => {
    it('devrait désactiver le bouton de soumission si le formulaire est invalide', () => {
      const button: HTMLButtonElement =
        fixture.nativeElement.querySelector('button[type="submit"]');
      expect(button.disabled).toBe(true);
    });

    it('devrait activer le bouton une fois le formulaire valide', () => {
      component.form.controls.email.setValue('test@test.com');
      component.form.controls.password.setValue('password123');
      fixture.detectChanges();

      const button: HTMLButtonElement =
        fixture.nativeElement.querySelector('button[type="submit"]');
      expect(button.disabled).toBe(false);
    });

    it("devrait afficher le message d'erreur dans le DOM", async () => {
      component.errorMessage = 'Email ou mot de passe incorrect.';

      const cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
      cdr.markForCheck();

      fixture.detectChanges();
      await fixture.whenStable();

      const errorEl: HTMLElement = fixture.nativeElement.querySelector('.form-error');
      expect(errorEl?.textContent).toContain('Email ou mot de passe incorrect.');
    });
  });
});
