import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ProfileService } from '../profile.service';
import { SecuritySectionComponent } from './security-section.component';

function setup(changePassword = vi.fn(() => of(undefined))) {
  TestBed.configureTestingModule({
    imports: [SecuritySectionComponent],
    providers: [{ provide: ProfileService, useValue: { changePassword } }],
  });
  const fixture = TestBed.createComponent(SecuritySectionComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, changePassword };
}

describe('SecuritySectionComponent', () => {
  it('est invalide si la confirmation ne correspond pas', () => {
    const { component } = setup();
    component.form.setValue({
      currentPassword: 'old',
      newPassword: 'password123',
      confirmPassword: 'autre',
    });
    expect(component.form.hasError('mismatch')).toBe(true);
  });

  it("n'appelle pas l'API si le formulaire est invalide", () => {
    const { component, changePassword } = setup();
    component.submit();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("envoie seulement l'ancien et le nouveau mot de passe, puis vide le formulaire", () => {
    const { component, changePassword } = setup();
    component.form.setValue({
      currentPassword: 'old',
      newPassword: 'password123',
      confirmPassword: 'password123',
    });
    component.submit();
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'old',
      newPassword: 'password123',
    });
    expect(component.success()).toBe(true);
    expect(component.form.getRawValue().newPassword).toBe('');
  });

  it("affiche le message d'erreur renvoyé par l'API", () => {
    const err = new HttpErrorResponse({
      status: 422,
      error: { error: 'Mot de passe actuel incorrect.' },
    });
    const { component } = setup(vi.fn(() => throwError(() => err)));
    component.form.setValue({
      currentPassword: 'faux',
      newPassword: 'password123',
      confirmPassword: 'password123',
    });
    component.submit();
    expect(component.error()).toBe('Mot de passe actuel incorrect.');
  });
});
