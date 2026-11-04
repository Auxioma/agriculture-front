import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileService } from '../profile.service';
import { PersonalDataSectionComponent } from './personal-data-section.component';

function setup() {
  const profile = { exportData: vi.fn(), deleteAccount: vi.fn() };
  TestBed.configureTestingModule({
    imports: [PersonalDataSectionComponent],
    providers: [{ provide: ProfileService, useValue: profile }],
  });
  const fixture = TestBed.createComponent(PersonalDataSectionComponent);
  const deleted = vi.fn();
  fixture.componentInstance.deleted.subscribe(deleted);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, profile, deleted };
}

/** Clique sur le bouton dont le texte contient `label`, puis rafraîchit l'écran. */
function click(fixture: ComponentFixture<PersonalDataSectionComponent>, label: string): void {
  const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
  const button = buttons.find((b) => b.textContent?.includes(label));
  if (!button) throw new Error(`Bouton introuvable : ${label}`);
  button.click();
  fixture.detectChanges();
}

describe('PersonalDataSectionComponent', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // jsdom n'implémente pas URL.createObjectURL ni la navigation d'un <a download> : on les remplace.
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() });
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => clickSpy.mockRestore());

  describe('suppression du compte', () => {
    it("demande une confirmation et n'appelle pas l'API au premier clic", () => {
      const { fixture, profile } = setup();
      click(fixture, 'Supprimer mon compte');

      expect(profile.deleteAccount).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Cette action est définitive');
    });

    it('« Annuler » referme la confirmation sans rien supprimer', () => {
      const { fixture, component, profile } = setup();
      click(fixture, 'Supprimer mon compte');
      click(fixture, 'Annuler');

      expect(component.confirming()).toBe(false);
      expect(profile.deleteAccount).not.toHaveBeenCalled();
    });

    it("émet 'deleted' après une suppression réussie", () => {
      const { fixture, profile, deleted } = setup();
      profile.deleteAccount.mockReturnValue(of(undefined));
      click(fixture, 'Supprimer mon compte');
      click(fixture, 'Oui, supprimer');

      expect(profile.deleteAccount).toHaveBeenCalledOnce();
      expect(deleted).toHaveBeenCalledOnce();
    });

    it("n'émet pas 'deleted' et affiche l'erreur si l'API échoue", () => {
      const { fixture, component, profile, deleted } = setup();
      profile.deleteAccount.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500, error: {} })),
      );
      click(fixture, 'Supprimer mon compte');
      click(fixture, 'Oui, supprimer');

      expect(deleted).not.toHaveBeenCalled();
      expect(component.error()).toBe('Suppression impossible.');
      expect(component.busy()).toBe(false);
    });
  });

  describe('export des données', () => {
    it("appelle l'API puis télécharge un fichier JSON", () => {
      const { fixture, component, profile } = setup();
      profile.exportData.mockReturnValue(of({ user: { email: 'marie.r@email.com' } }));
      click(fixture, 'Exporter mes données');

      expect(profile.exportData).toHaveBeenCalledOnce();
      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(clickSpy).toHaveBeenCalledOnce();
      expect(component.busy()).toBe(false);
    });

    it("affiche une erreur et ne télécharge rien si l'API échoue", () => {
      const { fixture, component, profile } = setup();
      profile.exportData.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500, error: {} })),
      );
      click(fixture, 'Exporter mes données');

      expect(component.error()).toBe("Impossible d'exporter vos données.");
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(component.busy()).toBe(false);
    });
  });
});
